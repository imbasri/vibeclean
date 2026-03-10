import { test, expect } from '@playwright/test';

// Run tests in serial to avoid race conditions with authentication state
test.describe.configure({ mode: 'serial' });

test.describe('Authentication Tests', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Test User',
    email: `test${timestamp}@example.com`,
    phone: '081234567890',
    password: 'Test1234!',
  };

  test('Register - should display register page correctly', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check that VibeClean text is visible (header)
    const vibeclean = page.locator('text=VibeClean').first();
    await expect(vibeclean).toBeVisible({ timeout: 15000 });
    
    // Check for the register form
    const nameInput = page.locator('input[id="name"]');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
  });

  test('Register - should register successfully with valid data', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.fill('input[id="name"]', testUser.name);
    await page.fill('input[id="email"]', testUser.email);
    await page.fill('input[id="phone"]', testUser.phone);
    await page.fill('input[id="password"]', testUser.password);
    await page.fill('input[id="confirmPassword"]', testUser.password);
    await page.check('input[id="terms"]');
    
    await page.getByRole('button', { name: 'Daftar Sekarang' }).click();
    
    // Wait for success message
    await expect(page.getByText('Pendaftaran Berhasil').first()).toBeVisible({ timeout: 15000 });
  });

  test('Login - should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Check that VibeClean text is visible
    const vibeclean = page.locator('text=VibeClean').first();
    await expect(vibeclean).toBeVisible({ timeout: 15000 });
    
    // Check for email input
    const emailInput = page.locator('input[id="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });

  test('Login - should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.fill('input[id="email"]', 'nonexistent@example.com');
    await page.fill('input[id="password"]', 'wrongpassword');
    
    await page.getByRole('button', { name: 'Masuk' }).click();
    
    // Wait for error message
    await expect(page.getByText('Email atau password salah').or(page.getByText('Invalid')).first()).toBeVisible({ timeout: 15000 });
  });

  test('Login - should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const passwordInput = page.locator('input[id="password"]');
    
    // Check initial state
    const initialType = await passwordInput.getAttribute('type');
    
    // Find and click the toggle button
    const toggleButton = page.locator('button').filter({ has: page.locator('svg.lucide-eye, svg.lucide-eye-off') }).first();
    await toggleButton.click();
    
    // Check type changed
    const afterClickType = await passwordInput.getAttribute('type');
    
    expect(afterClickType).toBe(initialType === 'password' ? 'text' : 'password');
  });

  test('Login - should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.getByText('Daftar sekarang').click();
    
    await expect(page).toHaveURL(/\/register/);
  });

  test('Navigation - should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    await page.getByText('Lupa password?').click();
    
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});
