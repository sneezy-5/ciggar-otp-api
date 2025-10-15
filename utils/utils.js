function formatPhoneNumber(phone) {
  let p = phone.toString().trim();
  // Supprime tout sauf chiffres
  p = p.replace(/[^0-9]/g, "");
  // Retire le + si présent
  if (p.startsWith("225")) {
    // tout va bien
  } else if (p.startsWith("0")) {
    p = "225" + p.substring(1);
  } else {
    // Cas où le numéro est sans 0 ni 225, on suppose indicatif pays déjà inclus
    p = "225" + p;
  }
  return `${p}@c.us`;
}


function formatIvoirianNumberCustom(rawNumber) {
  let phone = rawNumber.toString().trim();

  // Supprime tout sauf chiffres
  phone = phone.replace(/[^0-9]/g, "");

  // Supprime + si présent
  if (phone.startsWith("+")) phone = phone.substring(1);

  // Si le numéro est déjà avec indicatif pays
  if (phone.startsWith("225")) {
    return `${phone}@c.us`;
  }

  // Si numéro à 10 chiffres → ajouter 225 et retirer le 1er chiffre du numéro original
  if (phone.length === 10) {
    // ex: 0701234567 -> 225701234567
    return `225${phone.substring(2)}@c.us`;
  }

  // Si numéro à 8 chiffres → ajouter 225 directement
  if (phone.length === 8) {
    return `225${phone}@c.us`;
  }

  // Sinon utiliser tel quel
  return `${phone}@c.us`;
}
