import { STORAGE_SYSTEM_NAME } from '../consts';
import { detailsPage } from '../views/details-page';
import { listPage } from '../views/list-page';
import { modal } from '../views/modals';
import { ODFCommon } from '../views/odf-common';

const checkKebabMenuItem = (itemText: string) => {
  cy.byTestID('kebab-button').click();
  cy.contains(itemText).click();
  modal.shouldBeOpened();
  cy.byLegacyTestID('modal-cancel-action').click();
  modal.shouldBeClosed();
};

describe('Tests storage system list page', () => {
  beforeEach(() => {
    ODFCommon.visitStorageDashboard();
  });

  it('Test default(OCS) StorageSystem is listed', () => {
    ODFCommon.visitStorageDashboard();
    ODFCommon.visitStorageSystemList();
    listPage.searchInList(STORAGE_SYSTEM_NAME);

    // Test if the Kebab Menu contains all Items
    checkKebabMenuItem('Add Capacity');
    checkKebabMenuItem('Configure performance');

    // Todo(bipuladh): Add a proper data-selector once the list page is migrated
    // eslint-disable-next-line cypress/require-data-selectors
    cy.get('a').contains(STORAGE_SYSTEM_NAME).click();
    // Title should always use h1
    detailsPage
      .getResourceTitle()
      .contains(STORAGE_SYSTEM_NAME)
      .should('exist');
  });
});
