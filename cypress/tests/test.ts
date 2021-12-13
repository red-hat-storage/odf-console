import { STORAGE_SYSTEM_NAME } from "../consts";
import { listPage } from "../views/list-page";
import { ODFCommon } from "../views/odf-common";

describe('Tests storage system list page', () => {
    before(() => {
        cy.login();
        cy.visit('/');
        cy.install();
    })
    after(() => {
        cy.logout();
    });

    beforeEach(() => {
        ODFCommon.visitStorageDashboard();
    })

    it('Test default(OCS) StorageSystem is listed', () => {
        ODFCommon.visitStorageSystemList();
        listPage.searchInList(STORAGE_SYSTEM_NAME);
        // eslint-disable-next-line cypress/require-data-selectors
        cy.get('a').contains(STORAGE_SYSTEM_NAME).click();
        cy.contains('Utilzation', { timeout: 5 * 60000 });
    });
});
