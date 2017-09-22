//guidelines for creating tables schema
//1. can only contain 1 subtable per schema
//2. subtable cannot contain Dates
//3. In each doc, "userId" is the owner of the document.
//4. subline edit has to be full line.  Therefore subtable should be as slim as possible
//5. Adding autocomplete to DocLoad needs to also add the underlying 2 fields as well, they will be automatically hidden

import acctJournal, {acctJournalSchema, acctJournalView, newAcctJournal, updateAcctJournal, deleteAcctJournal, downloadAcctJournal, qtyAcctJournal} from './acct_journal.js';

import arap, {arapSchema, arapView, newArap, updateArap, deleteArap, downloadArap, qtyArap} from './arap.js';

import arapHistory, {arapHistorySchema, arapHistoryView, newArapHistory, updateArapHistory, deleteArapHistory, downloadArapHistory, qtyArapHistory} from './arapHistory.js';

import Business, {BusinessSchema, BusinessView, newBusiness, updateBusiness, deleteBusiness, downloadBusiness, qtyBusiness} from './business.js'

import Claims, {ClaimSchema, ClaimsView, newClaim, updateClaim, deleteClaim, downloadClaim, qtyClaim} from './claims.js';

import ClaimsHistory, {ClaimsHistorySchema, ClaimsHistoryView, newClaimsHistory, deleteClaimsHistory, downloadClaimsHistory, qtyClaimsHistory} from './claimsHistory.js'

import CoA, {CoASchema, CoAView, newCoA, updateCoA, deleteCoA, downloadCoA, qtyCoA} from './COA.js'

import OrgRole, {OrgRoleSchema, OrgRoleView, newOrgRole, updateOrgRole, deleteOrgRole, downloadOrgRole, qtyOrgRole} from './OrgRole.js'

import partymaster, {partymasterSchema, partymasterView, newpartymaster, updatepartymaster, deletepartymaster, downloadpartymaster, qtypartymaster} from './partymaster.js';

import Project, {ProjectSchema, ProjectView, newProject, updateProject, deleteProject, downloadProject, qtyProject} from './project.js'

import Status, {StatusSchema, StatusView, newStatus, updateStatus, deleteStatus, downloadStatus, qtyStatus} from './status.js'

export const tableHandles = (c) => {
	switch(c) {
		case 'acctJournal':
			return {
				'main': acctJournal,
				'schema': Object.assign({}, acctJournalSchema, {'_id': {label: 'ID'}}),
				'view': acctJournalView,
				'new': newAcctJournal,
				'update': updateAcctJournal,
				'delete': deleteAcctJournal,
				'download': downloadAcctJournal,
				'count': qtyAcctJournal,
				'singleDoc': 'acctJournal.getAcctJournal'
			};
		case 'arap':
			return {
				'main': arap,
				'schema': Object.assign({}, arapSchema, {'_id': {label: 'ID'}}),
				'view': arapView,
				'new': newArap,
				'update': updateArap,
				'delete': deleteArap,
				'download': downloadArap,
				'count': qtyArap,
				'singleDoc': 'arap.getArap'
			};
		case 'arapHistory':
			return {
				'main': arapHistory,
				'schema': Object.assign({}, arapHistorySchema, {'_id': {label: 'ID'}}),
				'view': arapHistoryView,
				'new': newArapHistory,
				'update': updateArapHistory,
				'delete': deleteArapHistory,
				'download': downloadArapHistory,
				'count': qtyArapHistory,
				'singleDoc': 'arapHistory.getArapHistory'
			};
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
		case 'OrgRole':
			return {
				'main': OrgRole,
				'schema': Object.assign({}, OrgRoleSchema, {'_id': {label: 'ID'}}),
				'view': OrgRoleView,
				'new': newOrgRole,
				'update': updateOrgRole,
				'delete': deleteOrgRole,
				'download': downloadOrgRole,
				'count': qtyOrgRole,
				'singleDoc': 'OrgRole.getOrgRole'
			};
		case 'partymaster':
			return {
				'main': partymaster,
				'schema': Object.assign({}, partymasterSchema, {'_id': {label: 'ID'}}),
				'view': partymasterView,
				'new': newPartymaster,
				'update': updatePartymaster,
				'delete': deletePartymaster,
				'download': downloadPartymaster,
				'count': qtyPartymaster,
				'singleDoc': 'partymaster.getPartymaster'
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
