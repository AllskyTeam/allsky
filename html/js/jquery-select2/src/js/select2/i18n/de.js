define(function () {
  // German
  return {
    errorLoading: function () {
      return 'Die Ergebnisse konnten nicht geladen werden.';
    },
    inputTooLong: function (args) {
      var overChars = args.input.length - args.maximum;

      return 'Bitte ' + overChars + ' Zeichen weniger eingeben';
    },
    inputTooShort: function (args) {
      var remainingChars = args.minimum - args.input.length;

      return 'Bitte ' + remainingChars + ' Zeichen mehr eingeben';
    },
    loadingMore: function () {
      return 'Lade mehr Ergebnisse…';
    },
    maximumSelected: function (args) {
      var message = 'Sie können nur ' + args.maximum + ' Element';

      if (args.maximum != 1) {
        message += 'e';
      }

      message += ' auswählen';

      return message;
    },
    noResults: function () {
      return 'Keine Übereinstimmungen gefunden';
    },
    searching: function () {
      return 'Suche…';
    },
    removeAllItems: function () {
      return 'Entferne alle Elemente';
    },
    removeItem: function () {
      return 'Element entfernen';
    },
    search: function() {
      return 'Suchen';
    }
  };
});
