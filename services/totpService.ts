
// Base32 decoding, stripped of padding
function base32ToBytes(base32: string): Uint8Array {
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bits = base32.toUpperCase().replace(/=+$/, '').split('').map(char => {
        const val = base32Chars.indexOf(char);
        if (val === -1) throw new Error("Invalid base32 character");
        return val.toString(2).padStart(5, '0');
    }).join('');

    const bytes = bits.match(/.{1,8}/g)!.map(chunk => parseInt(chunk, 2));
    return new Uint8Array(bytes.slice(0, Math.floor(bits.length / 8)));
}

export async function generateHOTP(secret: string, counter: number): Promise<string> {
    const decodedSecret = base32ToBytes(secret);
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    
    // The counter is a 64-bit integer, BigInt is not supported in all environments,
    // so we handle the 32-bit parts separately.
    let hi = Math.floor(counter / 0x100000000);
    let lo = counter % 0x100000000;
    view.setUint32(0, hi, false);
    view.setUint32(4, lo, false);
    
    const key = await crypto.subtle.importKey(
        'raw',
        decodedSecret,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );

    const hmacResult = await crypto.subtle.sign('HMAC', key, buffer);
    const hmacBytes = new Uint8Array(hmacResult);

    const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
    const binary =
        ((hmacBytes[offset] & 0x7f) << 24) |
        ((hmacBytes[offset + 1] & 0xff) << 16) |
        ((hmacBytes[offset + 2] & 0xff) << 8) |
        (hmacBytes[offset + 3] & 0xff);
    
    const otp = binary % 1000000;

    return otp.toString().padStart(6, '0');
}

export async function generateTOTP(secret: string): Promise<string> {
    const period = 30;
    const counter = Math.floor(Date.now() / 1000 / period);
    return generateHOTP(secret, counter);
}