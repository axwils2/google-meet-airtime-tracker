// content.js
let observer = null;
let intervalId = null;

const GOOGLE_MEET_OBSERVER_TARGET_CLASS = ".zWfAib";
const GOOGLE_MEET_SPEAKING_ICON_TARGET_CLASS = "IisKdb";
const MS_TEAMS_OBSERVER_TARGET_CLASS = ".ts-main";
const MS_TEAMS_SPEAKING_ICON_TARGET_CLASS = 'speaking';

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
  return { name: name, count: 0, nameEl: null };
};

function googleMeetParticipantId(target) {
  const idString =  $(target)?.parent()?.parent()?.parent()?.attr('data-initial-participant-id');
  if (!idString) return;

  const idStringParts = idString.split('/');
  return idStringParts[idStringParts.length - 1];
};

function googleMeetNameElement(target) {
  const nameElContainer = $(target)?.parent()?.parent()?.next();
  if (!nameElContainer) return;

  return nameElContainer.children()?.first()?.children()?.last();
}

function startMonitoring() {
  startObserving();
  startInterval();
  displayNotification();
}

function startObserving() {
  const host = window.location.host;

  if (host.includes('meet.google')) {
    const observerTarget = $(GOOGLE_MEET_OBSERVER_TARGET_CLASS)[0];

    observer = new MutationObserver(function(mutations, obs) {
      mutations.forEach(function(mutation) {
        const speakingIconTarget = $(mutation.target)
        const attributeValue = speakingIconTarget.prop(mutation.attributeName);
        if (!attributeValue || !attributeValue.includes(GOOGLE_MEET_SPEAKING_ICON_TARGET_CLASS)) return;

        const nameEl = googleMeetNameElement(speakingIconTarget);
        const id = googleMeetParticipantId(speakingIconTarget);
        if (!nameEl || !id) return;

        const name = removePercentageString($(nameEl).text());
        if (name.includes('Presentation (')) return;

        const participant = participants[id] || defaultParticipant(name);

        participant.count += 1;
        participant.nameEl = nameEl;
        participants[id] = participant;
      })
    });

    observer.observe(observerTarget, observerConfig);
  } else if (host.includes('teams.microsoft')) {
    const observerTarget = $(MS_TEAMS_OBSERVER_TARGET_CLASS)[0];

    observer = new MutationObserver(function(mutations, obs) {
      mutations.forEach(function(mutation) {
        const speakingIconTarget = $(mutation.target)
        const attributeValue = speakingIconTarget.prop(mutation.attributeName);
        if (!attributeValue || !attributeValue.includes(MS_TEAMS_SPEAKING_ICON_TARGET_CLASS)) return;

        const id = speakingIconTarget.attr('id');
        if (!id) return;

        const nameElId = id.replace('voice', 'name');
        const nameEl = $(`#${nameElId} span`)[0];

        if (!nameEl) return;

        const name = removePercentageString($(nameEl).text());
        const participant = participants[id] || defaultParticipant(name);
        const total = totalTalkTime();
        participant.count += 1;

        $(nameEl).text(name + talkPercentageString(participant.count, total));
        participants[id] = participant;
      });
    });

    observer.observe(observerTarget, observerConfig);
  }
}

function startInterval() {
  intervalId = setInterval(function() {
    const alertArray = ['Summary of Estimated Air Time Usage:'];
    const total = totalTalkTime();

    Object.keys(participants).forEach(function(participantKey) {
      const participant = participants[participantKey];
      alertArray.push(participant.name + ' ' + talkPercentageString(participant.count, total));

      updateParticipantName(participant, total);
    });

    chrome.runtime.sendMessage({ message: "summary_updated", alertText: alertArray.join('\n') });
  }, 1000);
}

function updateParticipantName(participant, total) {
  const nameEl = participant.nameEl;
  const name = removePercentageString($(nameEl).text());
  $(nameEl).text(name + talkPercentageString(participant.count, total));
}

function displayNotification() {
  var el = $("<div id='video-call-monitoring-notification' style='position: fixed; top: 50%; right: calc(50% - 80px); width: 160px; z-index: 2000; background-color: #c71a1a; padding: 8px; color: white; text-align: center; border-radius: 4px;'>Monitoring Started!</div>");
  $(document.body).append(el);

  setTimeout(function() {
    el.remove();
	}, 3000);
};

function stopMonitoring() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (intervalId) clearInterval(intervalId);
  chrome.runtime.sendMessage({ message: "monitoring_stopped" });
}

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === "clicked_browser_action") {
      if (observer) {
        stopMonitoring();
        sendResponse({ monitoring: false });
      } else {
        startMonitoring();
        sendResponse({ monitoring: true });
      }

      return true;
    }
  }
);