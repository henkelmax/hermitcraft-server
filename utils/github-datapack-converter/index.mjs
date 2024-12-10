import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

const filePath = path.resolve('datapacks.json');
const fileContent = await fs.readFile(filePath, 'utf-8');
const jsonData = JSON.parse(fileContent);

const results = [];

for (const datapack of jsonData) {
    const url = `https://github.com/${datapack.username}/${datapack.project}/archive/${datapack.branch}.zip`;

    console.log(`Downloading file from ${url}`);
    const fileBuffer = await downloadFile(url);
    console.log('File downloaded successfully');

    console.log('Calculating checksums...');

    const sha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');
    const sha512 = crypto.createHash('sha512').update(fileBuffer).digest('hex');

    const fileSize = fileBuffer.length;

    console.log('Results:');
    console.log(`SHA-512: ${sha512}`);
    console.log(`SHA-1: ${sha1}`);
    console.log(`File Size: ${fileSize} bytes`);

    results.push({
        downloads: [url],
        env: {
            client: 'required',
            server: 'required'
        },
        fileSize: fileSize,
        hashes: {
            sha1: sha1,
            sha512: sha512
        },
        path: `datapacks/${datapack.project}_${datapack.branch}.zip`
    });
}

await fs.writeFile('out.json', JSON.stringify(results, null, 2));

async function downloadFile(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const handleRequest = (currentUrl, redirectsLeft) => {
            https.get(currentUrl, (res) => {
                // Handle redirects
                if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                    if (redirectsLeft <= 0) {
                        res.destroy(); // Clean up the connection
                        return reject(new Error('Too many redirects'));
                    }
                    const newUrl = new URL(res.headers.location, currentUrl).toString();
                    res.destroy(); // Clean up the connection before redirecting
                    return handleRequest(newUrl, redirectsLeft - 1);
                }

                if (res.statusCode !== 200) {
                    res.destroy(); // Clean up the connection
                    return reject(new Error(`Failed to download file: HTTP ${res.statusCode}`));
                }

                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    resolve(Buffer.concat(chunks));
                    res.destroy(); // Ensure the connection is cleaned up after finishing
                });
                res.on('error', (err) => {
                    res.destroy(); // Clean up on error
                    reject(err);
                });
            }).on('error', reject);
        };

        handleRequest(url, maxRedirects);
    });
}