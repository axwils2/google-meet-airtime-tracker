// content.js
let monitoring = false;
let participants = {};

function totalTalkTime() {
  var total = Object.values(participants).map(function(participant) {
    return participant.count
  }).reduce(function(acc, val) { return acc + val; }, 0);

  return Math.max(total, 1);
};

function talkPercentageString(count, total) {
  return ' (' + (count / total * 100).toFixed(2) + '%)'
};

function startMonitoring() {
  $('.Djiqwe .IisKdb').each(function() {
    var nameEl = $(this).parent().next()[0];

    if (nameEl) {
      var idString = $(this).parent().parent().parent().parent().attr('data-initial-participant-id');

      if (idString) {
        var idStringParts = idString.split('/')
        var id = idStringParts[idStringParts.length - 1];
        var name = $(nameEl).text();
        var participant = participants[id] || {};

        participant.name = name;
        participant.count = 0;

        var observer = new MutationObserver(function(mutations, obs) {
          mutations.forEach(function(mutation) {
            if (mutation.attributeName === "class") {
              var target = $(mutation.target)
              var attributeValue = target.prop(mutation.attributeName);
              var previousCount = participant['count'] || 0;
              participant.count = previousCount + 1;

              $(nameEl).text(name + talkPercentageString(participant.count))
            }
          });
        });

        participant.observer = observer;
        participants[id] = participant;

        var config = {
          attributes: true
        };

        observer.observe(this, config);
      }
    }
  });
  
  console.log('Monitoring!');
  monitoring = true;
};

function stopMonitoring() {
  var alertArray = [];
  var total = totalTalkTime();

  Object.keys(participants).forEach(function(participantKey) {
    var participant = participants[participantKey];
    alertArray.push(participant.name + ' ' + talkPercentageString(participant.count, total));
    participant.observer.disconnect();
  });

  
  alert(alertArray.join('\n'));
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