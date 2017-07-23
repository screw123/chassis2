import { Tracker } from 'meteor/tracker';
import { autorun, action } from 'mobx';

export const autorunX = (trackerMobxAutorun) => {
	let mobxDisposer = null;
	let computation = null;
	let hasBeenStarted;
	return {
		start() {
			let isFirstRun = true;
			computation = Tracker.autorun(() => {
				if (mobxDisposer) {
					mobxDisposer();
					isFirstRun = true;
				}
				mobxDisposer = autorun(() => {
					if (isFirstRun) { trackerMobxAutorun() }
					else { computation.invalidate() }
					isFirstRun = false;
				});
			});
			hasBeenStarted = true;
		},
		stop() {
			if (hasBeenStarted) {
				computation.stop();
				mobxDisposer();
			}
		}
	};
};


export const observeX = (actionPrefix = '', observableArray, handle, cursor) => {
	if (handle.ready()) {
		// initially fetch all documents and store them in the observable array
		Tracker.nonreactive(() => {
			action(`${actionPrefix}: initial fetch`, (comments) => {
				observableArray.replace(comments);
			})(cursor.fetch());
		});

		// observe changes after initial fetch
		cursor.observe({
			// _suppress_initial suppresses addedAt callback for documents initially fetched
			_suppress_initial: true,
			addedAt: action(`${actionPrefix}: document added`, (document, atIndex) => {
				observableArray.splice(atIndex, 0, document);
			}),
			changedAt: action(`${actionPrefix}: document changed`, (newDocument, oldDocument, atIndex) => {
				observableArray.splice(atIndex, 1, newDocument);
			}),
			removedAt: action(`${actionPrefix}: document removed`, (oldDocument, atIndex) => {
				observableArray.splice(atIndex, 1);
			}),
			movedTo: action(`${actionPrefix}: document moved`, (document, fromIndex, toIndex) => {
				observableArray.splice(fromIndex, 1);
				observableArray.splice(toIndex, 0, document);
			}),
		});
	} else {
		action(`${actionPrefix}: initialized`, () => {
			//observableArray.clear();
		})();
	}
};
