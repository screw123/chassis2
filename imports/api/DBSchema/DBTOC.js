import Business, {BusinessSchema, BusinessView, newBusiness, updateBusiness, deleteBusiness, downloadBusiness, qtyBusiness} from './business.js'
import Project, {ProjectSchema, ProjectView, newProject, updateProject, deleteProject, downloadProject, qtyProject} from './project.js'
import Status, {StatusSchema, StatusView, newStatus, updateStatus, deleteStatus, downloadStatus, qtyStatus} from './status.js'

import Claims, {ClaimSchema, ClaimsView, newClaim, updateClaim, deleteClaim, downloadClaim, qtyClaim} from './claims.js';
import ClaimsHistory, {ClaimsHistorySchema, ClaimsHistoryView, newClaimsHistory, deleteClaimsHistory, downloadClaimsHistory, qtyClaimsHistory} from './claimsHistory.js'

import CoA, {CoASchema, CoAView, newCoA, updateCoA, deleteCoA, downloadCoA, qtyCoA} from './COA.js'

export const tableHandles = (c) => {
	switch(c) {
		case 'business':
			return {
				'main': Business,
				'schema': Object.assign({}, BusinessSchema, {'_id': {label: 'ID'}}),
				'view': BusinessView,
				'new': newBusiness,
				'update': updateBusiness,
				'delete': deleteBusiness,
				'download': downloadBusiness,
				'count': qtyBusiness,
				'singleDoc': 'business.getBusiness'
			};
		case 'claims':
			return {
				'main': Claims,
				'schema': Object.assign({}, ClaimSchema, {'_id': {label: 'ID'}}),
				'view': ClaimsView,
				'new': newClaim,
				'update': updateClaim,
				'delete': deleteClaim,
				'download': downloadClaim,
				'count': qtyClaim,
				'singleDoc': 'claims.getClaim'
			};
		case 'claimsHistory':
			return {
				'main': ClaimsHistory,
				'schema': Object.assign({}, ClaimsHistorySchema, {'_id': {label: 'ID'}}),
				'view': ClaimsHistoryView,
				'new': newClaimsHistory,
				'update': undefined,
				'delete': deleteClaimsHistory,
				'download': downloadClaimsHistory,
				'count': qtyClaimsHistory,
				'singleDoc': 'ClaimsHistory.getClaimsHistory'
			};
		case 'CoA':
			return {
				'main': CoA,
				'schema': Object.assign({}, CoASchema, {'_id': {label: 'ID'}}),
				'view': CoAView,
				'new': newCoA,
				'update': updateCoA,
				'delete': deleteCoA,
				'download': downloadCoA,
				'count': qtyCoA,
				'singleDoc': 'CoA.getCoA'
			};
		case 'project':
			return {
				'main': Project,
				'schema': Object.assign({}, ProjectSchema, {'_id': {label: 'ID'}}),
				'view': ProjectView,
				'new': newProject,
				'update': updateProject,
				'delete': deleteProject,
				'download': downloadProject,
				'count': qtyProject,
				'singleDoc': 'project.getProject'
			};
		case 'status':
			return {
				'main': Status,
				'schema': Object.assign({}, StatusSchema, {'_id': {label: 'ID'}}),
				'view': StatusView,
				'new': newStatus,
				'update': updateStatus,
				'delete': deleteStatus,
				'download': downloadStatus,
				'count': qtyStatus,
				'singleDoc': 'status.getStatus'
			};
		default:
			return undefined;
	}
}
