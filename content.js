// content.js
let observer = null;
let intervalId = null;

const GOOGLE_MEET_OBSERVER_TARGET_CLASS = ".WUFI9b";
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

function talkPercentageString(count, total, withPrefix = true) {
  const realPercent = count / total * 100;
  const safePercent = Math.min(realPercent, 100);
  const prefix = withPrefix ? 'Air Time: ' : '';

  return prefix + safePercent.toFixed(0) + '%';
};

function defaultParticipant(name) {
  return { name: name, count: 0, nameEl: null };
};

function googleMeetParticipantId(target) {
  let idStringContainer =  $(target)?.parent()?.parent()?.parent()?.parent()?.parent()
  let idString = idStringContainer?.attr('data-participant-id');

  if (!idString) {
    idStringContainer = $(target)?.parent()?.parent()?.parent()?.parent()?.parent()?.parent()?.parent();
    idString = idStringContainer?.attr('data-participant-id');
  }

  if (!idString) return;

  const idStringParts = idString.split('/');
  return idStringParts[idStringParts.length - 1];
};

function googleMeetNameElement(target) {
  let nameElContainer = $(target)?.parent()?.parent()?.parent()?.parent()?.prev();
  let nameEl = nameElContainer.children()?.last()?.children()?.first()?.children()?.first();

  if (!nameEl.text()) {
    nameElContainer = $(target)?.parent()?.parent()?.parent()?.parent()?.parent()?.parent()?.prev();
    nameEl = nameElContainer.children()?.last()?.children()?.first()?.children()?.first();
  }

  if (!nameEl.text()) return;

  return nameEl;
}

async function startMonitoring() {
  openPanel();
  await sleep(1000);
  startObserving();
  startInterval();
  displayNotification();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

function openPanel() {
  if ($(GOOGLE_MEET_OBSERVER_TARGET_CLASS).length > 0) return;

  const icon = $(".google-material-icons:contains('people_outline')");
  const button = icon.parent()[0];

  button.click();
};

function startObserving() {
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
      const participant = participants[id] || defaultParticipant(name);

      participant.count += 1;
      participant.nameEl = nameEl;
      participants[id] = participant;
    })
  });

  observer.observe(observerTarget, observerConfig);
}

function startInterval() {
  intervalId = setInterval(function() {
    const alertArray = ['Summary of Estimated Air Time Usage:'];
    const total = totalTalkTime();

    Object.keys(participants).forEach(function(participantKey) {
      const participant = participants[participantKey];
      alertArray.push(participant.name + ' - ' + talkPercentageString(participant.count, total, false));

      updateAirTimeDisplay(participantKey, participant, total);
    });

    chrome.runtime.sendMessage({ message: "summary_updated", alertText: alertArray.join('\n') });
  }, 1000);
}

function updateAirTimeDisplay(participantKey, participant, total) {
  const nameEl = participant.nameEl;
  const parentContainer = $(nameEl).parent()?.parent();
  const lastChild = parentContainer?.children()?.last();
  const displayContainerId = lastChild.attr('id');
  const id = 'air-time-' + participantKey;
  const text = talkPercentageString(participant.count, total);

  if (displayContainerId === id) {
    $(lastChild).text(text);
  } else {
    $(parentContainer).append("<span id='" + id + "' style='font-size: 0.75rem;'>" + text + "</span>")
  }
}

function displayNotification() {
  var el = $("<div id='video-call-monitoring-notification' style='position: fixed; top: 50%; right: calc(50% - 80px); width: 160px; z-index: 2000; background-color: #c71a1a; padding: 8px; color: white; text-align: center; border-radius: 4px;'>Monitoring Started!</div>");
  $(document.body).append(el);

  setTimeout(function() {
    el.remove();
	}, 1000);
};

function stopMonitoring() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }

  if (intervalId) clearInterval(intervalId);
  chrome.storage.local.get('alertText', function(data) {
    alert(data.alertText);
  })
  chrome.runtime.sendMessage({ message: "monitoring_stopped" })
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
