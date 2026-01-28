const fetch = require('node-fetch');

async function test(label, url, payload) {
    console.log(`--- Testing: ${label} ---`);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': 'dial-wfnnilpix4eykysekwfk90ecnd6'
            },
            body: JSON.stringify(payload)
        });
        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Body:', text.substring(0, 100));
        return response.status;
    } catch (error) {
        console.error('Failed:', error);
    }
}

async function runTests() {
    const endpoint = "https://ai-proxy.lab.epam.com/openai/deployments/gpt-4o-mini-2024-07-18/chat/completions";
    const versions = ["2024-02-15-preview", "2024-05-01-preview", "2024-08-01-preview"];

    for (const v of versions) {
        const url = `${endpoint}?api-version=${v}`;

        // Test 1: Bare minimum
        await test(`Version ${v} - Minimum Payload`, url, {
            messages: [{ role: 'user', content: "Hi" }]
        });

        // Test 2: With Model
        await test(`Version ${v} - With Model`, url, {
            messages: [{ role: 'user', content: "Hi" }],
            model: "gpt-4o-mini-2024-07-18"
        });

        // Test 3: With Stream True
        await test(`Version ${v} - Stream True`, url, {
            messages: [{ role: 'user', content: "Hi" }],
            stream: true
        });
    }
}

runTests();
