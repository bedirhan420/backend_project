const Enum = require("../config/Enum");

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
  
function isValidPassword(password) {
  const passwordRegex = new RegExp(`^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&.])[A-Za-z\\d@$!%*?&.]{${Enum.PASS_LENGTH},}$`);
  return passwordRegex.test(password);
}

function isValidPhoneNumber(number){
  return number.length === Enum.NUM_LENGTH;
}
  
module.exports = {
    isValidEmail,
    isValidPassword,
    isValidPhoneNumber
};
  