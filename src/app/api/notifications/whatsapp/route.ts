import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

interface WhatsAppMessage {
  phone: string;
  message: string;
}

// POST /api/notifications/whatsapp
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phone, message } = body as WhatsAppMessage;

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone and message are required" },
        { status: 400 }
      );
    }

    // Format phone number (remove special characters, keep +62 or 0)
    const formattedPhone = phone.replace(/[^0-9+]/g, "");
    const waPhone = formattedPhone.startsWith("+62") 
      ? formattedPhone 
      : formattedPhone.startsWith("62") 
        ? `+${formattedPhone}` 
        : `+62${formattedPhone.replace(/^0/, "")}`;

    // Check for WhatsApp provider configuration
    const provider = process.env.WHATSAPP_PROVIDER || "none";
    
    if (provider === "fonnte" && process.env.FONNTE_API_KEY) {
      // Send via Fonnte
      const fonnteResponse = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": process.env.FONNTE_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: waPhone,
          message: message,
        }),
      });

      const fonnteData = await fonnteResponse.json();
      
      if (!fonnteResponse.ok) {
        console.error("Fonnte error:", fonnteData);
        return NextResponse.json(
          { error: "Failed to send WhatsApp message" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "WhatsApp message sent successfully",
        provider: "fonnte",
      });
    } else if (provider === "mayar" && process.env.MAYAR_API_KEY) {
      // Send via Mayar (placeholder - implement based on Mayar API)
      // For now, just log the message
      console.log(`[Mayar WhatsApp] Would send to ${waPhone}: ${message}`);
      
      return NextResponse.json({
        success: true,
        message: "WhatsApp message queued (Mayar integration coming soon)",
        provider: "mayar",
      });
    } else {
      // No provider configured - just log (for development)
      console.log(`[WhatsApp] Would send to ${waPhone}: ${message}`);
      
      return NextResponse.json({
        success: true,
        message: "WhatsApp message logged (no provider configured)",
        provider: "none",
        logged: {
          phone: waPhone,
          message: message,
        },
      });
    }
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
