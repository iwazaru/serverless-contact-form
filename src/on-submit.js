// Sends a request to our lambda function
// Called when the form is submitted
export default async function onSubmit(
  event,
  setSuccess,
  setError,
  setLoading
) {
  // Prevent default behavior on form submit, because we don't want the browser
  // to POST to our server and reload the page
  event.preventDefault();
  try {
    // We set loading to true as we prepare to send form to server
    setLoading(true);

    // We use fetch to POST to the server, sending the form fields values
    // as the body and wait for the response
    const response = await fetch('/send', {
      method: 'post',
      body: new URLSearchParams(new FormData(event.target)),
    });

    // We set loading to false now that the server has responded
    setLoading(false);

    // Something bad happen as the server didn't respond with 200 OK
    // Let's throw a exception that we'll catch below
    if (response.status !== 200) {
      const message = await response.text();
      throw new Error(`An error occured: ${message}`);
    }

    // Everything went fine, the mail is sent, let's trigger a state update
    // by setting success to true and error to null
    setSuccess(true);
    setError(null);
  } catch (error) {
    // Something is fishy, an error was thrown, let's trigger a state update
    // by setting an error message
    setError(error.message);

    // We should also exit error state if an error was thrown
    setLoading(false);
  }
}
