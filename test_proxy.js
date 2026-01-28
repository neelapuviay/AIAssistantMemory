const fetch = require('node-fetch');

async function testProxy() {
    const url = "https://ai-proxy.lab.epam.com/openai/deployments/gpt-4o-mini-2024-07-18/chat/completions?api-version=2024-02-15-preview";
    const payload = {
        messages: [{ role: 'user', content: "Hi" }],
        model: "gpt-4o-mini-2024-07-18",
    };

    console.log('Testing Proxy without stream_options...');
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
        console.log('Body:', text);

        console.log('\nTesting Proxy WITH stream_options...');
        const payload2 = {
            ...payload,
            stream_options: { include_usage: true }
        };
        const response2 = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': 'dial-wfnnilpix4eykysekwfk90ecnd6'
            },
            body: JSON.stringify(payload2)
        });
        console.log('Status:', response2.status);
        const text2 = await response2.text();
        console.log('Body:', text2);

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testProxy();
