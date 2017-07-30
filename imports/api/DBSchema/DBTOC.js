import Claims, {ClaimSchema, ClaimsView, newClaim, updateClaim, deleteClaim, downloadClaim, qtyClaim} from './claims.js';
import Business, {BusinessSchema, BusinessView, newBusiness, updateBusiness, deleteBusiness, downloadBusiness, qtyBusiness} from './business.js'
import CoA, {CoASchema, CoAView, newCoA, updateCoA, deleteCoA, downloadCoA, qtyCoA} from './COA.js'

export const tableHandles = (c) => {
	switch(c) {
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
		default:
			return undefined;
	}
}
