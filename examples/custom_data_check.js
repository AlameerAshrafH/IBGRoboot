module.exports.validate = function(obj, config) {
    console.log("[Stateful custom assertion] Custom Assertion Running ...");


    // Custom data check
    if (obj.customField === 42) {
      return { status: true, error: '' };
    } else {
      return { status: false, error: 'customField is not 42!' };
    }
  };