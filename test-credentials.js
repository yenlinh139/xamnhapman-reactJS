// Test script to verify credentials
const testCredentials = () => {
    const correctCreds = 'nguyenduyliem@hcmuaf.edu.vn:DHNL@2345';
    const incorrectCreds = 'dragonmountain.project@gmail.com:DHNL@2345';
    
    const correctBase64 = Buffer.from(correctCreds).toString('base64');
    const incorrectBase64 = Buffer.from(incorrectCreds).toString('base64');
    
    console.log('Correct credentials:', correctCreds);
    console.log('Correct base64:', correctBase64);
    console.log('Decoded correct:', Buffer.from(correctBase64, 'base64').toString());
    console.log('');
    console.log('Incorrect credentials:', incorrectCreds);
    console.log('Incorrect base64:', incorrectBase64);
    console.log('Decoded incorrect:', Buffer.from(incorrectBase64, 'base64').toString());
    
    // The header from your log
    const headerFromLog = 'ZHJhZ29ubW91bnRhaW4ucHJvamVjdEBnbWFpbC5jb206REhOTEAyMzQ1';
    console.log('');
    console.log('Header from log:', headerFromLog);
    console.log('Decoded from log:', Buffer.from(headerFromLog, 'base64').toString());
    
    console.log('');
    console.log('Match with correct?', correctBase64 === headerFromLog);
    console.log('Match with incorrect?', incorrectBase64 === headerFromLog);
};

testCredentials();