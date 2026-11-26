import { beforeAll, describe, expect, it, vi } from 'vitest';

let sec: typeof import('../server/security');
beforeAll(async () => {
  vi.stubEnv('SESSION_SECRET', 'x'.repeat(40));
  vi.stubEnv('ADMIN_EMAILS', 'Owner@Example.com');
  vi.stubEnv('ALLOWED_EMAIL_DOMAINS', 'college.edu');
  sec = await import('../server/security');
});

const user = { sub: '123', email: 'stu@college.edu', name: 'Stu' };

describe('session tokens', () => {
  it('round-trips and derives role from env', () => {
    expect(sec.readSessionToken(sec.createSessionToken(user))?.role).toBe('user');
    const admin = sec.readSessionToken(sec.createSessionToken({ ...user, email: 'owner@example.com' }));
    expect(admin?.role).toBe('admin');
  });
  it('rejects tampered payloads (privilege escalation)', () => {
    const [, sig] = sec.createSessionToken(user).split('.');
    const forged = Buffer.from(JSON.stringify({ ...user, email: 'owner@example.com', exp: Date.now() + 1e9 })).toString('base64url');
    expect(sec.readSessionToken(`${forged}.${sig}`)).toBeNull();
  });
  it('rejects expired and malformed tokens', () => {
    const old = sec.createSessionToken(user, Date.now() - 8 * 86_400_000);
    expect(sec.readSessionToken(old)).toBeNull();
    expect(sec.readSessionToken('garbage')).toBeNull();
    expect(sec.readSessionToken(undefined)).toBeNull();
  });
});

describe('email policy', () => {
  it('only allows the college domain, admins always allowed', () => {
    expect(sec.emailAllowed('a@college.edu')).toBe(true);
    expect(sec.emailAllowed('a@dept.college.edu')).toBe(true);
    expect(sec.emailAllowed('a@gmail.com')).toBe(false);
    expect(sec.emailAllowed('a@evilcollege.edu')).toBe(false);
    expect(sec.emailAllowed('owner@example.com')).toBe(true);
  });
  it('admin check is case-insensitive and exact', () => {
    expect(sec.isAdminEmail('OWNER@example.com')).toBe(true);
    expect(sec.isAdminEmail('owner@example.com.evil.com')).toBe(false);
  });
});

describe('sniffImage', () => {
  it('recognises real image headers and rejects HTML', () => {
    expect(sec.sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mime).toBe('image/jpeg');
    expect(sec.sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe('image/png');
    expect(sec.sniffImage(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
  });
});
