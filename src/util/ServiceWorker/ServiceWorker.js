console.log("top of ServiceWorker.js");

self.addEventListener("push", event => {
  console.log("push notification received, event:", event);

  const payload = event.data ? event.data.text() : "no payload";

  event.waitUntil(
    self.ServiceWorkerRegistration.showNotification("Catch The Run", {
      body: payload
    })
  );
});
