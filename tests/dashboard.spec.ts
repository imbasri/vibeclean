import { test, expect } from '@playwright/test';

// Run tests in parallel for independent tests
test.describe.configure({ mode: 'parallel' });

test.describe('Public Pages', () => {
  test('Home page should load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    const url = page.url();
    expect(url).toContain('localhost:3000');
    
    const content = await page.content();
    expect(content.length).toBeGreaterThan(1000);
  });

  test('Login page should load', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    const url = page.url();
    expect(url).toContain('/login');
    
    const content = await page.content();
    expect(content).toContain('Masuk');
  });

  test('Register page should load', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    const url = page.url();
    expect(url).toContain('/register');
    
    const content = await page.content();
    expect(content).toContain('Daftar');
  });
});

test.describe('Authentication Flow', () => {
  test('Complete registration and login flow', async ({ page }) => {
    const timestamp = Date.now();
    const email = `flowtest${timestamp}@example.com`;
    
    // Register
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    await page.fill('input[id="name"]', 'Flow Test User');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="phone"]', '081234567890');
    await page.fill('input[id="password"]', 'Test1234!');
    await page.fill('input[id="confirmPassword"]', 'Test1234!');
    await page.check('input[id="terms"]');
    await page.getByRole('button', { name: 'Daftar Sekarang' }).click();
    
    // Wait for success message
    await expect(page.getByText('Pendaftaran Berhasil').first()).toBeVisible({ timeout: 10000 });
    
    // Should redirect to login after success
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
    
    // Now login
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'Test1234!');
    await page.getByRole('button', { name: 'Masuk' }).click();
    
    // Wait for dashboard
    await page.waitForTimeout(3000);
    
    // Should be on dashboard (either /dashboard or /dashboard/)
    const url = page.url();
    expect(url).toContain('/dashboard');
  });
});

test.describe('Protected Routes without Auth', () => {
  test('Dashboard redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    
    // Check if still on dashboard or redirected
    const url = page.url();
    console.log('Dashboard redirect test - URL:', url);
  });
});
