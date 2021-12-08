export const ODFCommon = {
    visitStorageDashboard: () => {
        cy.clickNavLink(['Storage', 'OpenShift Data Foundation']);
    },
    visitStorageSystemList: () => {
        cy.clickNavLink(['Storage', 'OpenShift Data Foundation']);
        cy.contains('Storage Systems').click();
    }
}
