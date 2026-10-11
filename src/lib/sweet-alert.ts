type ConfirmOptions = {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
};

async function loadSweetAlert() {
  const { default: Swal } = await import("sweetalert2");
  // These shared alerts never collect input. Keep the library's dormant
  // controls out of layout even when application-wide form CSS uses !important.
  return Swal.mixin({
    willOpen: (popup) => {
      popup.querySelectorAll<HTMLElement>(
        ".swal2-input, .swal2-file, .swal2-range, .swal2-select, .swal2-radio, .swal2-checkbox, .swal2-textarea",
      ).forEach((control) => {
        control.hidden = true;
        control.style.setProperty("display", "none", "important");
      });
    },
  });
}

export async function confirmDanger({
  title,
  text,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
}: ConfirmOptions) {
  const Swal = await loadSweetAlert();
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    buttonsStyling: false,
    heightAuto: false,
    customClass: {
      container: "app-swal-container",
      popup: "app-swal-popup",
      title: "app-swal-title",
      htmlContainer: "app-swal-copy",
      actions: "app-swal-actions",
      confirmButton: "app-swal-button app-swal-button-danger",
      cancelButton: "app-swal-button app-swal-button-secondary",
    },
  });

  return result.isConfirmed;
}

export async function showActionSuccess(message: string) {
  const Swal = await loadSweetAlert();
  await Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    didOpen: (popup) => {
      popup.addEventListener("mouseenter", () => Swal.stopTimer());
      popup.addEventListener("mouseleave", () => Swal.resumeTimer());
    },
    heightAuto: false,
    customClass: {
      container: "app-swal-container app-swal-toast-container",
      popup: "app-swal-toast",
      title: "app-swal-toast-title",
    },
  });
}

export async function showActionError(message: string) {
  const Swal = await loadSweetAlert();
  await Swal.fire({
    title: "ดำเนินการไม่สำเร็จ",
    text: message,
    icon: "error",
    confirmButtonText: "รับทราบ",
    buttonsStyling: false,
    heightAuto: false,
    customClass: {
      container: "app-swal-container",
      popup: "app-swal-popup",
      title: "app-swal-title",
      htmlContainer: "app-swal-copy",
      confirmButton: "app-swal-button app-swal-button-primary",
    },
  });
}
