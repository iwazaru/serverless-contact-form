import React from 'react';
import onSubmit from './on-submit';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Contact me</h1>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">Your name:</label>
          <input type="text" id="name" name="name" required />
        </div>
        <div className="field">
          <label htmlFor="email">Your email:</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div className="field">
          <label htmlFor="subject">Your subject:</label>
          <input type="text" id="subject" name="subject" required />
        </div>
        <div className="field">
          <label htmlFor="message">Your message:</label>
          <textarea id="message" name="message" rows="20" required></textarea>
        </div>
        <div className="field">
          <button className="submit-button" type="submit">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;
