import React, { useState } from 'react';
import onSubmit from './on-submit';
import './App.css';

function App() {
  /*
    We initiate our state, create hooks, and set default values
    - loading (boolean): is the form currently being sent? (default: false)
    - success (boolean): has the form been successfuly sent? (default: false)
    - error (string): contains a message if an error occured (default: null)  
  */
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="App">
      <h1>Contact me</h1>

      {/* If an error message is set, we display it above form */}
      {error && <div className="error">{error}</div>}

      {/* If success is set to true, we display a success message */}
      {/* Else, we display the form, passing our hooks function to onSubmit */}
      {success ? (
        <div className="success">Your message was sent!</div>
      ) : (
        <form
          onSubmit={event => onSubmit(event, setSuccess, setError, setLoading)}
        >
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
            {/* 
              While the form is being sent, we disable the submit button to
              prevent sending it multiple time if the user clicks again, and
              change the button label to "Sending…"
            */}
            <button className="submit-button" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default App;
