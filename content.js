// content.js
let observer = null;

const OBSERVER_TARGET_CLASS = ".zWfAib";
const SPEAKING_ICON_TARGET_CLASS = "IisKdb";

const participants = {};
const observerConfig = {
  attributes: true,
  attributeFilter: ['class'],
  subtree: true
};

function totalTalkTime() {
  var total = Object.values(participants).map(function(participant) {
    return participant.count
  }).reduce(function(acc, val) { return acc + val; }, 0);

  return Math.max(total, 1);
};

function removePercentageString(string) {
  return string.replace(/ *\([^)]*\%\) */g, "");
}

function talkPercentageString(count, total) {
  const realPercent = count / total * 100;
  const safePercent = Math.min(realPercent, 100);

  return ' (' + safePercent.toFixed(2) + '%)';
};

function defaultParticipant(name) {
  return { name: name, count: 0 };
};

function participantId(target) {
  const idString =  $(target)?.parent()?.parent()?.parent()?.parent()?.attr('data-initial-participant-id');
  if (!idString) return;

  const idStringParts = idString.split('/');
  return idStringParts[idStringParts.length - 1];
};

function startMonitoring() {
  const observerTarget = $(OBSERVER_TARGET_CLASS)[0];

  observer = new MutationObserver(function(mutations, obs) {
    mutations.forEach(function(mutation) {
      const speakingIconTarget = $(mutation.target)
      const attributeValue = speakingIconTarget.prop(mutation.attributeName);
      if (!attributeValue || !attributeValue.includes(SPEAKING_ICON_TARGET_CLASS)) return;

      const nameEl = speakingIconTarget.parent().next()[0];
      const id = participantId(speakingIconTarget);

      if (!nameEl || !id) return;

      const name = removePercentageString($(nameEl).text());
      if (name.includes('Presentation (')) return;

      const participant = participants[id] || defaultParticipant(name);
      const total = totalTalkTime();
      participant.count += 1;

      $(nameEl).text(name + talkPercentageString(participant.count, total));
      participants[id] = participant;
    });
  });

  observer.observe(observerTarget, observerConfig);
  console.log('Monitoring!');
}

function stopMonitoring() {
  if (observer) {
    observer.disconnect();
    observer = null;

    const alertArray = [];
    const total = totalTalkTime();

    Object.keys(participants).forEach(function(participantKey) {
      const participant = participants[participantKey];
      alertArray.push(participant.name + ' ' + talkPercentageString(participant.count, total));
    });
  
    alert(alertArray.join('\n'));
    
  }

  console.log('Monitoring stopped!');
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === "clicked_browser_action") {
      if (observer) {
        stopMonitoring();
      } else {
        startMonitoring();
      }
    }
  }
);