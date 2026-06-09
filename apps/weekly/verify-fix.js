
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4000/api';
let TOKEN = '';

async function login() {
    console.log('Logging in...');
    // Assuming a test user exists or we can create one. 
    // Let's try to signup first to be safe, or login if exists.
    const email = 'test@example.com';
    const password = 'password123';

    try {
        let res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (res.status === 400 || res.status === 404) {
            console.log('User might not exist, trying signup...');
            res = await fetch(`${BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
        }

        if (!res.ok) {
            console.error(`Login error: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error(text);
            return null;
        }

        const data = await res.json();
        TOKEN = data.token;
        console.log('Logged in, token received.');
        return data.user.id;
    } catch (e) {
        console.error('Login request failed:', e);
        return null;
    }
}

async function getChild() {
    console.log('Fetching children...');
    const res = await fetch(`${BASE_URL}/children`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!res.ok) {
        console.error('Failed to get children');
        return null;
    }

    const children = await res.json();
    if (children.length > 0) {
        console.log(`Found existing child: ${children[0].id}`);
        return children[0].id;
    }

    console.log('No children found, creating one...');
    const createRes = await fetch(`${BASE_URL}/children`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'TestChild',
            color: 'indigo',
            grade: 'elementary',
            startTime: '08:00',
            endTime: '20:00'
        })
    });
    const newChild = await createRes.json();
    console.log(`Created new child: ${newChild.id}`);
    return newChild.id;
}

async function verifyFix(childId) {
    if (!childId) return;

    console.log(`Verifying fix for child ${childId}...`);

    // 1. Update Config (PUT)
    const newConfig = {
        study: 100,
        academy: 50,
        rest: 10
    };

    console.log('Sending PUT request...');
    const putRes = await fetch(`${BASE_URL}/rewards/${childId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
    });

    if (!putRes.ok) {
        console.error('PUT request failed:', await putRes.text());
        return;
    }
    console.log('PUT request successful.');

    // 2. Fetch Config (GET)
    console.log('Sending GET request to verify...');
    const getRes = await fetch(`${BASE_URL}/rewards/${childId}`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const fetchedConfig = await getRes.json();

    console.log('Fetched Config:', fetchedConfig);

    if (fetchedConfig.study === 100 && fetchedConfig.academy === 50) {
        console.log('SUCCESS: Reward config updated and persisted!');
    } else {
        console.error('FAILURE: Config did not match expected values.');
    }
}

async function run() {
    try {
        const userId = await login();
        if (userId) {
            const childId = await getChild();
            await verifyFix(childId);
        }
    } catch (e) {
        console.error('Test failed:', e);
    }
}

run();
