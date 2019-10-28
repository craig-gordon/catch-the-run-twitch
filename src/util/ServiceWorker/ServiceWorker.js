self.addEventListener("push", event => {
  const payload = event.data ? event.data.text() : "no payload";

  event.waitUntil(
    self.ServiceWorkerRegistration.showNotification("Catch The Run", {
      body: payload
    })
  );
});
