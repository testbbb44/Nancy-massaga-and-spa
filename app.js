const bookingDialog = document.querySelector(".booking-dialog");
const bookingForm = document.querySelector("#booking-form");
const successDialog = document.querySelector(".success-dialog");
const siteConfig = window.MASSAGE_SITE_CONFIG || {};
const successSms = successDialog?.querySelector(".success-sms");
const successWhatsapp = successDialog?.querySelector(".success-whatsapp");
const studioDigits = (siteConfig.studioPhone || "").replace(/\D/g, "");

if (successSms && successWhatsapp && studioDigits.length >= 8 && studioDigits.length <= 15) {
  const formattedPhone = studioDigits.length === 11 && studioDigits.startsWith("1")
    ? `+1 ${studioDigits.slice(1, 4)}-${studioDigits.slice(4, 7)}-${studioDigits.slice(7)}`
    : `+${studioDigits}`;
  successSms.href = `sms:+${studioDigits}`;
  successSms.textContent = formattedPhone;
  successWhatsapp.href = `https://wa.me/${studioDigits}`;
} else if (successSms && successWhatsapp) {
  successSms.closest(".success-contact").hidden = true;
}

if (bookingDialog && bookingForm && successDialog) {
  const serviceField = bookingForm.elements.service;
  const packageField = bookingForm.elements.sessionPackage;
  const dateField = bookingForm.elements.appointmentDate;
  const timeField = bookingForm.elements.appointmentTime;
  const emailField = bookingForm.elements.email;
  const paymentField = bookingForm.elements.paymentMethod;
  const btcPanel = bookingDialog.querySelector(".btc-panel");
  const contactPanel = bookingDialog.querySelector(".contact-panel");
  const walletAddress = bookingDialog.querySelector(".wallet-address");
  const copyWalletButton = bookingDialog.querySelector(".copy-wallet");
  const walletCopied = bookingDialog.querySelector(".wallet-copied");
  const submitButton = bookingDialog.querySelector(".submit-booking");
  const message = bookingDialog.querySelector(".form-message");
  const smsLink = bookingDialog.querySelector(".sms-link");
  const whatsappLink = bookingDialog.querySelector(".whatsapp-link");
  let hasCopiedWallet = false;
  let successTimeout;

  const localDate = new Date();
  dateField.min = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;

  function setMessage(text, kind = "") {
    message.textContent = text;
    message.className = `form-message${kind ? ` ${kind}` : ""}`;
  }

  function selectedPrice() {
    return { "1-hour": 200, "2-hours": 250, "3-hours": 300, "all-night": 800 }[
      packageField.value
    ];
  }

  function emailConfigured() {
    return Boolean(
      siteConfig.emailJsServiceId &&
      siteConfig.emailJsTemplateId &&
      siteConfig.emailJsPublicKey,
    );
  }

  function bookingFieldsValid() {
    return (
      serviceField.value &&
      packageField.value &&
      dateField.value &&
      timeField.value &&
      emailField.validity.valid &&
      bookingForm.checkValidity()
    );
  }

  function refreshContactLinks() {
    const body = [
      "I would like to book a session.",
      `Treatment: ${serviceField.value}`,
      `Session: ${packageField.options[packageField.selectedIndex].text}`,
      `Price: $${selectedPrice()} USD`,
      `Appointment: ${dateField.value} at ${timeField.value}`,
      `Email: ${emailField.value.trim()}`,
      `Payment preference: ${paymentField.value}`,
    ].join("\n");
    const number = (siteConfig.studioPhone || "").replace(/\D/g, "");
    const available = Boolean(
      number &&
      number.length >= 8 &&
      number.length <= 15 &&
      bookingFieldsValid(),
    );
    smsLink.href = available
      ? `sms:${number}?body=${encodeURIComponent(body)}`
      : "#";
    whatsappLink.href = available
      ? `https://wa.me/${number}?text=${encodeURIComponent(body)}`
      : "#";
    for (const link of [smsLink, whatsappLink]) {
      link.setAttribute("aria-disabled", String(!available));
      link.classList.toggle("is-disabled", !available);
    }
  }

  function updatePaymentView() {
    const method = paymentField.value;
    const isBtc = method === "btc";
    const isContact = method !== "" && !isBtc;
    btcPanel.hidden = !isBtc;
    contactPanel.hidden = !isContact;
    submitButton.hidden = !isBtc;
    submitButton.textContent = "I've completed the payment";

    if (!isBtc) {
      hasCopiedWallet = false;
      walletCopied.checked = false;
    }
    walletCopied.disabled = !hasCopiedWallet;
    submitButton.disabled = !(
      emailConfigured() &&
      bookingFieldsValid() &&
      (!isBtc || (siteConfig.btcWalletAddress && hasCopiedWallet))
    );

    if (isContact) {
      setMessage(
        siteConfig.studioPhone
          ? ""
          : "The studio contact number has not been configured yet.",
      );
      refreshContactLinks();
    } else if (isBtc && !emailConfigured()) {
      setMessage(
        "Payment email is not configured yet. Ask the studio to finish its email setup.",
      );
    } else if (isBtc && !siteConfig.btcWalletAddress) {
      setMessage(
        "Bitcoin wallet is not configured yet. Please contact the studio.",
      );
    } else {
      setMessage("");
    }
  }

  document.querySelectorAll(".js-book").forEach((button) => {
    button.addEventListener("click", () => {
      bookingForm.reset();
      if (button.dataset.service) serviceField.value = button.dataset.service;
      if (button.dataset.package) packageField.value = button.dataset.package;
      hasCopiedWallet = false;
      walletCopied.checked = false;
      setMessage("");
      // updatePaymentView();
      bookingDialog.showModal();
      serviceField.focus();
    });
  });

  bookingDialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => bookingDialog.close());
  bookingDialog.addEventListener("click", (event) => {
    if (event.target === bookingDialog) bookingDialog.close();
  });
  successDialog.addEventListener("cancel", (event) => event.preventDefault());

  bookingForm.addEventListener("input", updatePaymentView);
  bookingForm.addEventListener("change", updatePaymentView);

  copyWalletButton.addEventListener("click", async () => {
    if (!siteConfig.btcWalletAddress) return;
    try {
      await navigator.clipboard.writeText(siteConfig.btcWalletAddress);
      hasCopiedWallet = true;
      walletCopied.checked = true;
      walletCopied.disabled = false;
      updatePaymentView();
      setMessage(
        "Wallet address copied. You can now report your payment.",
        "success",
      );
    } catch {
      setMessage(
        "Could not copy the address. Check browser clipboard permissions and try again.",
        "error",
      );
    }
  });

  for (const link of [smsLink, whatsappLink]) {
    link.addEventListener("click", (event) => {
      if (!bookingFieldsValid() || !siteConfig.studioPhone) {
        event.preventDefault();
        if (!siteConfig.studioPhone)
          setMessage(
            "The studio contact number has not been configured yet.",
            "error",
          );
        else bookingForm.reportValidity();
      } else if (link.href.endsWith("#")) {
        event.preventDefault();
      }
    });
  }

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!bookingForm.reportValidity()) return;

    const method = paymentField.value;
    if (method !== "btc") {
      setMessage("Choose SMS or WhatsApp above to send your booking request.");
      return;
    }
    if (
      method === "btc" &&
      (!siteConfig.btcWalletAddress || !hasCopiedWallet)
    ) {
      setMessage(
        "Copy the Bitcoin wallet address before reporting payment.",
        "error",
      );
      return;
    }
    if (!emailConfigured()) {
      setMessage(
        "Payment email is not configured yet. Ask the studio to finish its email setup.",
        "error",
      );
      return;
    }

    submitButton.disabled = true;
    setMessage("");
    const packageLabel = packageField.options[packageField.selectedIndex].text;
    const templateParams = {
      payment_method: "Bitcoin",
      payment_status:
        "Customer reports payment; owner must verify independently.",
      customer_email: emailField.value.trim(),
      service: serviceField.value,
      session_package: packageLabel,
      amount: `$${selectedPrice()} USD`,
      appointment_date: dateField.value,
      appointment_time: timeField.options[timeField.selectedIndex].text,
      message: [
        `Customer email: ${emailField.value.trim()}`,
        `Treatment: ${serviceField.value}`,
        `Session: ${packageLabel}`,
        `Amount reported: $${selectedPrice()} USD`,
        `Appointment requested: ${dateField.value} at ${timeField.options[timeField.selectedIndex].text}`,
        "Payment method: Bitcoin",
        "Payment is reported by the customer and has not been independently verified.",
      ].join("\n"),
    };

    try {
      const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_id: siteConfig.emailJsServiceId,
            template_id: siteConfig.emailJsTemplateId,
            user_id: siteConfig.emailJsPublicKey,
            template_params: templateParams,
          }),
        },
      );
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(
          `Email service could not send the notice${detail ? `: ${detail.slice(0, 180)}` : "."}`,
        );
      }

      bookingForm.reset();
      hasCopiedWallet = false;
      walletCopied.checked = false;
      bookingDialog.close();
      clearTimeout(successTimeout);
      successDialog.showModal();
      successTimeout = window.setTimeout(() => {
        document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
      }, 3000);
    } catch (error) {
      updatePaymentView();
      setMessage(
        error.message || "Could not send the payment notice. Please try again.",
        "error",
      );
    }
  });

  if (siteConfig.btcWalletAddress) {
    walletAddress.textContent = siteConfig.btcWalletAddress;
    copyWalletButton.disabled = false;
  } else {
    copyWalletButton.disabled = true;
  }
  updatePaymentView();
}

document.querySelectorAll("[data-year]").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    mainNav.classList.toggle("is-open", !expanded);
  });
}

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  document
    .querySelectorAll(".reveal, .treatment-card")
    .forEach((element) => revealObserver.observe(element));
} else {
  document
    .querySelectorAll(".reveal, .treatment-card")
    .forEach((element) => element.classList.add("is-visible"));
}
