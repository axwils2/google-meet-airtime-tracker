// content.js
let monitoring = false;
let participants = {};

function startMonitoring() {
  $divs = $('.Djiqwe .IisKdb').each(function() {
    var nameEl = $(this).parent().next()[0];

    if (nameEl) {
      var name = $(nameEl).text();
      var participant = participants[name] || {};
      participant.count = 0;
      var observer = new MutationObserver(function(mutations, obs) {
        mutations.forEach(function(mutation) {
          if (mutation.attributeName === "class") {
            var target = $(mutation.target)
            var attributeValue = target.prop(mutation.attributeName);
            var previousCount = participant['count'] || 0;
            participant['count'] = previousCount + 1;
          }
        });
      });

      participant['observer'] = observer;
      participants[name] = participant;

      var config = {
        attributes: true
      };

      observer.observe(this, config);
    }
  });
  
  const names = Object.keys(participants).join(', ');
  console.log('Monitoring ' + names + '!');

  monitoring = true;
};

function stopMonitoring() {
  var totalTalkTime = Object.values(participants).map(function(participant) {
    return participant.count
  }).reduce(function(acc, val) { return acc + val; }, 0);

  Object.keys(participants).forEach(function(participantName) {
    var participant = participants[participantName];
    console.log(participantName + ' talked for roughly ' + Math.ceil(participant.count / 12) + ' seconds (' + (participant.count / totalTalkTime * 100).toFixed(2) + '%)');
    participant.observer.disconnect();
  });

  console.log('Monitoring stopped!');
  monitoring = false;
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === "clicked_browser_action") {
      if (monitoring) {
        stopMonitoring();
      } else {
        startMonitoring();
      }
    }
  }
);