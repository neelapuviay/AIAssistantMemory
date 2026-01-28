const fetch = require('node-fetch');

async function testChat() {
    const payload = {
        messages: [{ role: 'user', content: "Hi, I'm Vinay. Please remember that I love working with graph databases." }]
    };

    console.log('Sending request to /api/chat...');
    try {
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log('Response Status:', response.status);
        if (!response.ok) {
            const text = await response.text();
            console.error('Response Error Body:', text);
            return;
        }

        console.log('Response Headers:', response.headers.raw());

        // Read stream
        const reader = response.body;
        reader.on('data', (chunk) => {
            console.log('Chunk received:', chunk.toString());
        });
        reader.on('end', () => {
            console.log('Stream ended.');
        });
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testChat();
