/**
 * PlanPet — relay de correos para la feria (Google Apps Script).
 *
 * Despliega este script como App Web y pega su URL en NEXT_PUBLIC_PLANPET_WEBHOOK.
 * Pasos en docs/apps-script/README.md.
 *
 * La app arma todo el HTML del correo y lo envía aquí; este script solo lo
 * reenvía con MailApp.sendEmail (relay tonto). Valida un token compartido para
 * disuadir el uso por terceros.
 */

// Debe coincidir EXACTAMENTE con NEXT_PUBLIC_PLANPET_TOKEN del proyecto.
var TOKEN = 'CAMBIA-ESTE-TOKEN';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.token !== TOKEN) {
      return salida({ ok: false, error: 'token-invalido' });
    }
    if (!data.email || !data.html) {
      return salida({ ok: false, error: 'faltan-campos' });
    }

    MailApp.sendEmail({
      to: data.email,
      subject: data.subject || 'Tu plan de PlanPet 🐾',
      htmlBody: data.html,
      name: 'PlanPet',
    });

    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

// Permite verificar en el navegador que la URL está viva (GET).
function doGet() {
  return salida({ ok: true, service: 'planpet-mailer' });
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
