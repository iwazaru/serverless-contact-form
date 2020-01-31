# Create a serverless contact form with Netlify

⚠️ WORK IN PROGRESS

This is a repository companion for a how-to guide I'm currently working on.

Features:

- A contact form that can be hosted on a serverless free host (e.g. Netlify)
- Connect through any SMTP delivery service

Requirements:

- [Node.js](https://nodejs.org/en/download/) v12+
- [Yarn](https://legacy.yarnpkg.com/lang/en/docs/install/#mac-stable) v1.21+
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) v2.30+ (`yarn global add netlify-cli`)
- Credentials for your SMTP delivery service
- A [Netlify](https://www.netlify.com/) account
- A [Github](https://github.com/) account

## 1. Bootstrap React app

```console
$ yarn create react-app serverless-contact-form
$ cd serverless-contact-form
$ yarn start
```

=> localhost:3000

Everything OK? Cool but we'll use Netlify Dev (why)?
<kbd>Ctrl</kbd> + <kbd>C</kbd> to exits react scripts dev server.

Start Netlify Dev:

```console
$ netlify dev
```

Netlify Dev automagically detects create-react-app and runs react-scripts
under the hood, providing the same functionalities, such as live reload.

=> http://localhost:8888/

## 2. Build form using React

Add a basic form by replacing everything in `App.js` inside `<div className="App"></div>` by:

```jsx
{/* src/App.js */
<h1>Contact me</h1>
<form>
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
```

And everything in `App.css` by:

```css
/* src/App.css */
.App {
  margin: auto;
  max-width: 600px;
  padding: 0 10px;
}

.App .field {
  margin-top: 15px;
}

.App .field label,
.App .field input,
.App .field textarea {
  box-sizing: border-box;
  display: block;
  font-size: 1em;
  width: 100%;
}

.App .field input,
.App .field textarea {
  border: 1px solid lightgrey;
  padding: 5px;
}

.App .field input:focus,
.App .field textarea:focus {
  border-color: grey;
}

.App .field label {
  margin-bottom: 5px;
  cursor: pointer;
}

.App .submit-button {
  background: #007bff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  display: block;
  color: white;
  font-size: 1em;
  margin: auto;
  padding: 5px 10px;
}
```

Save the two files so that Netlify Dev live reloads our changes.

## 3. Handle form submit on front-end

Add an onSubmit function in `src/on-submit.js` (let's keep it simple for now):

```js
/* src/on-submit.js */
// Sends a request to our lambda function
// Called when the form is submitted
export default async function onSubmit(event) {
  // Prevent default behavior on form submit, because we don't want the browser
  // to POST to our server and reload the page
  event.preventDefault();
  try {
    // We use fetch to POST to the server, sending the form fields values
    // as the body and wait for the response
    const response = await fetch('/send', {
      method: 'post',
      body: new URLSearchParams(new FormData(event.target)),
    });

    // Something bad happen as the server didn't respond with 200 OK
    // Let's throw a exception that we'll catch below
    if (response.status !== 200) {
      const message = await response.text();
      throw new Error(`An error occured: ${message}`);
    }

    // Everything went fine, the mail is sent, let's tell the user with an alert
    alert('Mail was sent!');
  } catch (error) {
    // Something is fishy, an error was thrown, let's display the message to
    // the user using alert
    alert(error.message);
  }
}
```

And hook it to our form submit event in `App.js`:

```diff
/* App.js */
import React from 'react';
-import logo from './logo.svg';
+import onSubmit from './on-submit';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Contact me</h1>
-      <form>
+      <form onSubmit={onSubmit}>
```

We can now submit the form and see that nothing happens. This is normal!
Using our browser's dev tool network tab, we can see that a pending POST request
was send to the `/send` route but Netlify Dev doesn't know how to handle it
yet. Let's fix that.

## 4. Handle POST request with a serverless function

Add nodemailer module:

```console
$ yarn add nodemailer
```

We'll add our serverless function in `functions/send.js`:

```js
/* functions/send.js */
const qs = require('querystring');
const nodemailer = require('nodemailer');

// Get SMTP credentials + contact email from env vars
const { SMTP, CONTACT_EMAIL } = process.env;

// Check that required env vars are defined
if (typeof SMTP === 'undefined' || typeof CONTACT_EMAIL === 'undefined') {
  throw new Error(
    'SMTP and CONTACT_EMAIL environment variables must be defined'
  );
}

// This is our serverless function
// Docs: https://www.netlify.com/docs/functions/#the-handler-method
exports.handler = async event => {
  try {
    // If we received a request with anything but POST method, respond with 400
    if (event.httpMethod !== 'POST') {
      return { statusCode: 400, body: '' };
    }

    // We can get the POST body in the event argument passed to this function
    // and parse it with the querystring module to get our form field values
    const { name, email, subject, message } = qs.parse(event.body);

    // We use a connection url to pass all credentials at once
    // i.e. smtps://username:password@smtp.example.com/?pool=true
    // Docs: https://nodemailer.com/smtp/
    const mailer = nodemailer.createTransport(SMTP);

    // We pass a message configuration as argument to the sendmail method
    // Docs: https://nodemailer.com/message/
    await mailer.sendMail({
      // The FROM e-mail address must have been authorized in the Mailjet
      // dashboard, so we can't use the sender's real address, but we can
      // use their name here, and print their address in the mail's body
      from: `${name} <${CONTACT_EMAIL}>`,
      // We'll use sender email in the REPLY-TO field though,
      // so we can just hit reply from the mail we'll receive
      replyTo: email,
      to: CONTACT_EMAIL,
      subject,
      // Below is the text of the sent message. It ends by a line including the
      // `DEPLOY_URL` env var that is injected by Netlify so we can keep track
      // of where this was sent from.
      text: `
${message}

---
Sent from ${process.env.DEPLOY_URL}
by ${name} <${email}>`,
    });

    // Everything is OK, respond 200 to our react app
    return { statusCode: 200, body: '' };
  } catch (err) {
    return { statusCode: 500, body: err.message };
  }
};
```

Configure netlify functions folder and `netlify.toml`:

```toml
# ./netlify.toml
[build]
  functions = "./functions" # where our functions are stored

# Rewrite url to hide ".netlify/functions"
[[redirects]]
  from = "/send"
  to = "/.netlify/functions/send"
  status = 200
```

Restart Netlify Dev server

Endpoint:

Our lambda function should now work and we can test it by sending a POST request
to the endpoint:

```console
$ curl -X POST http://localhost:8888/send
```

... or simply by hitting the **Submit** button of our form.

If we reach to our endpoint, it will throw an exception because we haven't
set our SMTP credentials as environment variables yet. Let's do that now.

## 5. Create netlify site and link it to our project

For now, this is required to inject env var into Netlify Dev:
https://github.com/netlify/cli/issues/444

Login to netlify

```console
$ netlify login
```

Create a new netlify site (you can skip this step if you already did it):

```console
$ netlify sites:create
? Team: Your team's team
Choose a unique site name (e.g. super-cool-site-by-iwazaru.netlify.com) or leave it blank for a random name. You can update the site name later.
? Site name (optional): your-app-name

Site Created

Admin URL: https://app.netlify.com/sites/your-app-name
URL:       https://your-app-name.netlify.com
Site ID:   5oM3-RANDoM-cHaRaC73R2
```

Select team and choose site name, copy the new site's ID,
then let's link our project to the site:

```console
$ netlify link

netlify link will connect this folder to a site on Netlify

? How do you want to link this folder to a site? Enter a site ID
? What is the site ID? 5oM3-RANDoM-cHaRaC73R2

Directory Linked

Admin url: https://app.netlify.com/sites/your-app-name
Site url:  https://your-app-name.netlify.com

Site id saved to ~/serverless-contact-form/.netlify/state.json

You can now run other `netlify` cli commands in this directory
```

Enter site id or choose from a list.
Netlify CLI will create a `.netlify/state.json` to locally save the site id and
add it to `.gitignore`.

Let's finish this step by checking that everything is OK:

```console
$ netlify status
```

### We can now add environment variables to Netlify

Unfortunately, there is [no way right now to access local environment variables
from our Netlify Dev executed functions](https://community.netlify.com/t/no-way-to-have-separate-environment-variables-for-production-and-netlify-dev/1269).
We must add them to the netlify's site using the dashboard that we can access with `netlify open`.

```env
SMTP
CONTACT_EMAIL #
```

Restart Netlify Dev (<kbd>Ctrl</kbd> + <kbd>C</kbd> and `$ netlify dev`)

On restart:

```console
◈ Netlify Dev ◈
◈ Injected build setting env var: CONTACT_EMAIL
◈ Injected build setting env var: SMTP
```

Our lambda function should now work. If we try submitting our form, we should get
a nice alert and receive a mail (or get an error message that will help us
debug).

## 6. Handle success or error state on front-end

Let's handle state in our app with hooks:

Let's update `src/on-submit.js` to add the `setSuccess` and `setError`
hooks, that we'll be respectively called to update the state when a mail was
successfully sent or when an error occurred.

```diff
/* src/on-submit.js */
-export default async function onSubmit(event) {
+export default async function onSubmit(
+ event,
+ setSuccess,
+ setError,
+ setLoading
+) {
  // Prevent default behavior on form submit, because we don't want the browser
  // to POST to our server and reload the page
  event.preventDefault();
  try {
+     // We set loading to true as we prepare to send form to server
+    setLoading(true);

    // We use fetch to POST to the server, sending the form fields values
    // as the body and wait for the response
    const response = await fetch('/send', {
      method: 'post',
      body: new URLSearchParams(new FormData(event.target)),
    });

+   // We set loading to false now that the server has responded
+   setLoading(false);
+

    // Something bad happen as the server didn't respond with 200 OK
    // Let's throw a exception that we'll catch below
    if (response.status !== 200) {
      const message = await response.text();
      throw new Error(`An error occured: ${message}`);
    }

-    // Everything went fine, the mail is sent, let's tell the user with an alert
-    alert('Mail was sent!');
+    // Everything went fine, the mail is sent, let's trigger a state update
+    // by setting success to true and error to null
+    setSuccess(true);
+    setError(null);
  } catch (error) {
-    // Something is fishy, an error was thrown, let's display the message to
-    // the user using alert
-    alert(error.message);
+    // Something is fishy, an error was thrown, let's trigger a state update
+    // by setting an error message
+    setError(error.message);
  }
```

```diff
/* src/App.js */
-import React from 'react';
+import React, { useState } from 'react';
import onSubmit from './lib/on-submit';

import './App.css';

function App() {
+ /*
+   We initiate our state, create hooks, and set default values
+   - loading (boolean): is the form currently being sent? (default: false)
+   - success (boolean): has the form been successfuly sent? (default: false)
+   - error (string): contains a message if an error occured (default: null)
+ */
+ const [loading, setLoading] = useState(false);
+ const [success, setSuccess] = useState(false);
+ const [error, setError] = useState(null);
+
  return (
    <div className="App">
      <h1>Contact me</h1>
+
+     {/* If an error message is set, we display it above form */}
+     {error && <div className="error">{error}</div>}
+
+     {/* If success is set to true, we display a success message */}
+     {/* Else, we display the form, passing our hooks function to onSubmit */}
+     {success ? (
+       <div className="success">Your message was sent!</div>
+     ) : (
-       <form onSubmit={onSubmit}>
+       <form
+         onSubmit={event => onSubmit(event, setSuccess, setError, setLoading)}
+       >
// (...)
+         <div className="field">
+           {/*
+             While the form is being sent, we disable the submit button to
+             prevent sending it multiple time if the user clicks again, and
+             change the button label to "Sending…"
+           */}
+           <button className="submit-button" type="submit" disabled={loading}>
+             {loading ? 'Sending…' : 'Submit'}
+           </button>
+         </div>
+       </form>
+      )}
    </div>
  );
}

export default App;
```

Let's add a disabled state for our submit button style
and make our status message pop up with some nice colors:

```css
/* src/App.css */
/* ... */
.App .submit-button:disabled {
  opacity: 0.5;
}

.App .success {
  color: #28a745;
}

.App .error {
  color: #dc3545;
}
```

Once Netlify Dev has reloaded our app, we should now see a nice success message
showing above the form once the form has been successfully sent (or an nice
error message if something went wrong)

## 7. Server-side validation

Add [validator.js](https://github.com/validatorjs/validator.js) module:

```console
yarn add validator
```

Implement server-side validation:

```diff
/* functions/send.js */
const qs = require('querystring');
+const validator = require('validator');
const nodemailer = require('nodemailer');

/* ... */

    // We can get the POST body in the event argument passed to this function
    // and parse it with the querystring module to get our form field values
    const { name, email, subject, message } = qs.parse(event.body);

+   // User input validation
+   try {
+     // Check that all fields are filled and are string
+     Object.entries({ name, email, subject, message }).forEach(
+       ([field, value]) => {
+         if (typeof value !== 'string') {
+           throw new Error(`${field} is a required field`);
+         }
+
+         // Ignore whitespace so that fields with only whitespace are 
+         // considered empty
+         if (validator.isEmpty(value, { ignore_whitespace: true })) {
+           throw new Error(`${field} is a required field`);
+         }
+       }
+     );
+
+     // Check that email field value is an email
+     if (!validator.isEmail(email)) {
+       throw new Error('email must be a valid email address');
+     }
+   } catch (error) {
+     return { statusCode: 522, body: error.message };
+   }

    // We use a connection url to pass all credentials at once
    // i.e. smtps://username:password@smtp.example.com/?pool=true
    // Docs: https://nodemailer.com/smtp/
    const mailer = nodemailer.createTransport(SMTP);
```

## 8. Personalize the form with our name

Later, we will configure Netlify automated development and as part of this
process, we'll have to push our code to Github. Off course we don't want our
SMTP credentials to appear in a public repo, and that's why we used server-side
environment variables. But maybe that's also true for our personal
informations like our name.

We are going to use build time env var, that will be injected in our react app
when it is built on netlify server's. As a react-scripts convention, they have
to be prefixed with `REACT_APP_`. So let's go and open netlify admin again
(`$ netlify open`) and then add our name as an env in Settings > Build & deploy.

```env
REACT_APP_CONTACT_NAME=Clément Bourgoin
```

Now when we exit and restart Netlify Dev (<kbd>Ctrl</kbd> + <kbd>C</kbd> and
`$ netlify dev`), we can verify that our new env var is available:

```console
◈ Netlify Dev ◈
◈ Injected build setting env var: CONTACT_EMAIL
◈ Injected build setting env var: SMTP
◈ Injected build setting env var: REACT_APP_CONTACT_NAME
```

We can access this env var from our react app using
`process.env.REACT_APP_CONTACT_NAME`. Let's insert it in the title above our
form:

```diff
  /* src/App.js */
  /* … */
  return (
    <div className="App">
-     <h1>Contact me</h1>
+     <h1>Contact {process.env.REACT_APP_CONTACT_NAME}</h1>
      {/* … */}
```

We can also use it in the `index.html` file to set the page title that we have
left to the default "React App" until now:

```diff
    <!-- public/index.html -->
-    <title>React App</title>
+    <title>Contact %REACT_APP_CONTACT_NAME%</title>
  </head>
```

After we save the files and Netlify Dev reload our app, we'll see our name
appear both in the browser tab's title and in the page above our form.

## 9. Deploy to netlify

At last, we can show our contact form to the world!

Netlify CLI has a `deploy` command, but this only work to deploy strictly
static files. As we have a build step and functions, we need to take advantage
of Netlify's continuous integration (CI) functionality.

To build our react app, we need to run `yarn build`. react-scripts will compile
our app in the `build` directory. Netlify needs to know all this as it will
get our app's source code from our Github repo. So let's add this to our Netlify
config file's build section:

```diff
# netlify.toml
[build]
  functions = "./functions" # where our functions are stored
+ build = "yarn build" # our build command
+ publish = "./build" # the directory to publish

# Rewrite url to hide ".netlify/functions"
[[redirects]]
  from = "/send"
  to = "/.netlify/functions/send"
  status = 200
```

We now need to [create a new Github repository](https://github.com/new). Once
this is done, we can initialize our local repository (that create-react-app
initialized when we scaffolded the react app) and add the Github repo as origin:

```console
git remote add origin git@github.com:yourusername/serverless-contact-form.git
git add .
git commit -m "Implement serverless contact form"
```

We now can link our Netlify site to our Github repository:

```console
$ netlify init
```

and finally push to Github to trigger a new deploy:

```console
git push origin master
```

Let's check that everything is OK but opening the site:

```console
netlify open:site
```

## TODO

- Captcha

## Troubleshooting

Netlify Dev is still in beta and I've run into a few problems while using it.

### "Something is already running on port 3000."

Netlify Dev runs on the port 8888, but that it also runs our react app under
the hood at port 3000 and proxy request to the correct port so we don't have
to worry about it.

Problems seems to be that if Netlify Dev crashes (which can happens because of
an exception thrown by our lambda function), it doesn't properly stops the
react-scripts process, leave port 3000 unavailable, and thus fail to start it
again.

One quick fix, if this happens, is to kill all running node processes using:

```console
$ killall node
```

[See netlify-cli issue #580](https://github.com/netlify/cli/issues/580)

### "Error: socket hang up"

It seems that Netlify Dev randomly crashes throwing this error. The only
situation where I witness this, is when I immediately close the browser tab that
Netlify Dev automatically opens on startup.

If you're like me and find this behavior annoying, you can set the
`autoLaunch` param to `false` in your `netlify.toml` file's `[dev]` block.

```toml
[dev]
  autoLaunch = false
```

[netlify.toml [dev] block documentation](https://github.com/netlify/cli/blob/master/docs/netlify-dev.md#netlifytoml-dev-block)  
[See netlify-cli issue #404](https://github.com/netlify/cli/issues/404)
