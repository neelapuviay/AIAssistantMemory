const fetch = require('node-fetch');

async function testEmbedding() {
    const url = "https://ai-proxy.lab.epam.com/openai/deployments/text-embedding-3-small-1/embeddings?api-version=2024-02-15-preview";
    const payload = {
        input: "Hi",
        model: "text-embedding-3-small-1",
    };

    console.log('Testing Embedding Proxy...');
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
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testEmbedding();
