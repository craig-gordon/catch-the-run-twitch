export default class Communication {
  sendSubscriptionRequest() {
    return new Promise((resolve, reject) => {
      fetch(
        "https://sebb5pvixl.execute-api.us-east-1.amazonaws.com/dev/subscription/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            Player: "cyghfer",
            Protocol: "SMS",
            Endpoint: "+16969696969"
          })
        }
      )
        .then(response => resolve(response))
        .catch(e => {
          console.log("error:", e);
          reject(e);
        });
    });
  }
}
