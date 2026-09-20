// Byggplugin: när en produktionsdeploy publicerats anropas funktionen utskick på den nya deployen,
// som mejlar prenumeranterna om det som tillkommit. Bygget själv får inte skriva till det
// sajtgemensamma lagret i Netlify Blobs; det får funktionen. Resultatet visas i deployens
// sammanfattning i Netlify och i bygglogen. Logiken ligger i netlify/lib/utskick.mjs.

export const onSuccess = async ({ utils }) => {
  const { CONTEXT, DEPLOY_URL, UTSKICK_HEMLIGHET } = process.env;
  if (CONTEXT !== 'production') {
    console.log(`utskick: hoppar över, kontexten är ${CONTEXT}`);
    return;
  }
  if (!DEPLOY_URL || !UTSKICK_HEMLIGHET) {
    console.log('utskick: hoppar över, DEPLOY_URL eller UTSKICK_HEMLIGHET saknas (lokalt bygge?)');
    return;
  }
  const bas = DEPLOY_URL.replace(/\/$/, '');
  try {
    const res = await fetch(`${bas}/.netlify/functions/utskick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-utskick-nyckel': UTSKICK_HEMLIGHET },
      body: JSON.stringify({ bas }),
    });
    const text = await res.text();
    let resultat = {};
    try { resultat = JSON.parse(text); } catch { resultat = { steg: text.slice(0, 200) }; }
    const rad = resultat.nya?.length ? `${resultat.steg}: ${resultat.nya.join(', ')}` : `${resultat.steg}${resultat.antal ? ` (${resultat.antal} poster)` : ''}${resultat.fel ? `: ${resultat.fel}` : ''}`;
    console.log(`utskick: ${res.status} ${rad}`);
    utils.status.show({ title: res.ok ? 'Utskick till prenumeranterna' : 'Utskick till prenumeranterna misslyckades', summary: rad });
  } catch (fel) {
    // Ett misslyckat utskick ska inte göra deployen röd; det syns i loggen och i sammanfattningen.
    const text = String(fel && fel.stack ? fel.stack : fel).replace(/\s+/g, ' ').slice(0, 600);
    console.log(`utskick: FEL ${text}`);
    utils.status.show({ title: 'Utskick till prenumeranterna misslyckades', summary: text });
  }
};
