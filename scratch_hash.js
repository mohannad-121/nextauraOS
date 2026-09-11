import crypto from 'crypto';
console.log(crypto.createHash('sha256').update('1061228336618492').digest('hex'));
