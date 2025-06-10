import React from 'react';

export default function TestApp() {
  return (
    <div style={{ padding: '20px', background: '#1e293b', color: 'white', minHeight: '100vh' }}>
      <h1>Shape Editor Test</h1>
      <p>If you can see this, React is working correctly.</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}