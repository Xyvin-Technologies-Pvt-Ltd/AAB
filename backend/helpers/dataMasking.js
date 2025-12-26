/**
 * Mask sensitive data - show only last 4 digits
 * @param {string} value - Value to mask
 * @param {number} visibleDigits - Number of digits to show (default: 4)
 * @returns {string} Masked value
 */
export const maskSensitiveData = (value, visibleDigits = 4) => {
  if (!value || typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length <= visibleDigits) {
    return '*'.repeat(trimmed.length);
  }

  const visible = trimmed.slice(-visibleDigits);
  const masked = '*'.repeat(trimmed.length - visibleDigits);
  return `${masked}${visible}`;
};

/**
 * Mask TRN (Tax Registration Number)
 * @param {string} trn - TRN value
 * @returns {string} Masked TRN
 */
export const maskTRN = (trn) => {
  return maskSensitiveData(trn, 4);
};

/**
 * Mask CTRN (Corporate Tax Registration Number)
 * @param {string} ctrn - CTRN value
 * @returns {string} Masked CTRN
 */
export const maskCTRN = (ctrn) => {
  return maskSensitiveData(ctrn, 4);
};

/**
 * Mask Emirates ID number
 * @param {string} idNumber - Emirates ID number
 * @returns {string} Masked ID
 */
export const maskEmiratesID = (idNumber) => {
  return maskSensitiveData(idNumber, 4);
};

/**
 * Mask Passport number
 * @param {string} passportNumber - Passport number
 * @returns {string} Masked passport number
 */
export const maskPassport = (passportNumber) => {
  return maskSensitiveData(passportNumber, 4);
};

/**
 * Mask password - show only last 2 characters
 * @param {string} password - Password value (will be masked completely if exists)
 * @returns {string} Masked password
 */
export const maskPassword = (password) => {
  if (!password) {
    return null;
  }
  // Always mask passwords completely for security
  return '••••••••';
};

/**
 * Mask username - show first 2 and last 2 characters
 * @param {string} username - Username value
 * @returns {string} Masked username
 */
export const maskUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return username;
  }
  const trimmed = username.trim();
  if (trimmed.length <= 4) {
    return '*'.repeat(trimmed.length);
  }
  const first = trimmed.slice(0, 2);
  const last = trimmed.slice(-2);
  const middle = '*'.repeat(trimmed.length - 4);
  return `${first}${middle}${last}`;
};

/**
 * Mask client data for non-authorized users
 * @param {Object} client - Client object
 * @param {boolean} isAuthorized - Whether user has full access
 * @returns {Object} Client object with masked sensitive data
 */
export const maskClientData = (client, isAuthorized = false) => {
  if (isAuthorized) {
    return client;
  }

  const masked = { ...client };

  // Mask business info
  if (masked.businessInfo) {
    masked.businessInfo = { ...masked.businessInfo };
    if (masked.businessInfo.trn) {
      masked.businessInfo.trn = maskTRN(masked.businessInfo.trn);
    }
    if (masked.businessInfo.ctrn) {
      masked.businessInfo.ctrn = maskCTRN(masked.businessInfo.ctrn);
    }
  }

  // Mask partners and managers
  if (masked.partners) {
    masked.partners = masked.partners.map((partner) => ({
      ...partner,
      emiratesId: partner.emiratesId
        ? {
            ...partner.emiratesId,
            number: partner.emiratesId.number ? maskEmiratesID(partner.emiratesId.number) : null,
          }
        : null,
      passport: partner.passport
        ? {
            ...partner.passport,
            number: partner.passport.number ? maskPassport(partner.passport.number) : null,
          }
        : null,
    }));
  }

  if (masked.managers) {
    masked.managers = masked.managers.map((manager) => ({
      ...manager,
      emiratesId: manager.emiratesId
        ? {
            ...manager.emiratesId,
            number: manager.emiratesId.number ? maskEmiratesID(manager.emiratesId.number) : null,
          }
        : null,
      passport: manager.passport
        ? {
            ...manager.passport,
            number: manager.passport.number ? maskPassport(manager.passport.number) : null,
          }
        : null,
    }));
  }

  // Mask EmaraTax credentials
  if (masked.emaraTaxAccount) {
    masked.emaraTaxAccount = {
      ...masked.emaraTaxAccount,
      username: masked.emaraTaxAccount.username
        ? maskUsername(masked.emaraTaxAccount.username)
        : null,
      password: masked.emaraTaxAccount.password ? maskPassword(masked.emaraTaxAccount.password) : null,
    };
  }

  return masked;
};

