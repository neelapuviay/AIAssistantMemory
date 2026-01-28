const fetch = require('node-fetch');

async function testDeleteAll() {
    try {
        const res = await fetch('http://localhost:3000/api/memories', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleteAll: true })
        });
        const data = await res.json();
        console.log('Delete All Result:', data);
    } catch (error) {
        console.error('Delete All failed:', error);
    }
}

testDeleteAll();
