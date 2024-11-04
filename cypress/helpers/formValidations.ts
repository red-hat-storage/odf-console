const validName = 'a-valid.name';
const invalidName = '-a-valid..name.';
const formErrorMessage = 'Address form errors to proceed';

const checkfieldRequirementsAreDisplayed = (textFieldDataId: string) => {
  cy.byTestID(textFieldDataId).focus();
  cy.byTestID('field-requirements-popover').should('be.visible');
};

const checkTextFieldInputValidation = (
  textFieldDataId: string,
  value: string = validName,
  className: string = 'rich-input__group--success'
) => {
  cy.byTestID(textFieldDataId).type(value);
  cy.byTestID(textFieldDataId).blur();
  cy.byTestID('field-requirements-input-group').should('have.class', className);
};

const checkTextFieldInputIsSuccess = (
  textFieldDataId: string,
  value: string = validName
) => {
  checkTextFieldInputValidation(
    textFieldDataId,
    value,
    'rich-input__group--success'
  );
};

const checkTextFieldInputIsError = (
  textFieldDataId: string,
  value: string = invalidName
) => {
  checkTextFieldInputValidation(
    textFieldDataId,
    value,
    'rich-input__group--invalid'
  );
};

const checkSubmitIsDisabled = (
  buttonText: string,
  nameFieldTestId: string,
  value: string = invalidName
) => {
  cy.byTestID(nameFieldTestId).type(value);
  cy.byTestID(nameFieldTestId).blur();
  cy.contains('button', buttonText).should('have.attr', 'disabled');
};

const checkSubmitIsNotDisabled = (
  buttonText: string,
  nameFieldTestId: string,
  value: string = validName
) => {
  cy.byTestID(nameFieldTestId).type(value);
  cy.byTestID(nameFieldTestId).blur();
  cy.contains('button', buttonText).should('not.have.attr', 'disabled');
};

const submitForm = (
  buttonText: string,
  nameFieldTestId: string,
  value: string = invalidName
) => {
  cy.byTestID(nameFieldTestId).type(value);
  cy.byTestID(nameFieldTestId).blur();
  cy.contains('button', buttonText).click();
};

const fieldRequirementTests = (nameFieldTestId: string) => {
  it('Should display field requirements on input focus', () => {
    checkfieldRequirementsAreDisplayed(nameFieldTestId);
  });

  it('Should highlight name field with success style on valid input', () => {
    checkTextFieldInputIsSuccess(nameFieldTestId);
  });

  it('Should highlight name field with error style on invalid input', () => {
    checkTextFieldInputIsError(nameFieldTestId);
  });
};

export const fieldValidationOnWizardFormsTests = (
  nameFieldTestId: string,
  buttonText: string,
  populateForm?: () => void
) => {
  fieldRequirementTests(nameFieldTestId);

  it('Should disable submit button on invalid or empty required fields', () => {
    checkSubmitIsDisabled(buttonText, nameFieldTestId);
  });

  it('Should not disable submit button on valid input fields', () => {
    populateForm?.();
    checkSubmitIsNotDisabled(buttonText, nameFieldTestId);
  });
};

export const fieldValidationOnFormsTests = (
  nameFieldTestId: string,
  buttonText: string,
  populateForm?: () => void
) => {
  fieldRequirementTests(nameFieldTestId);

  it('Should display error alert on invalid or empty required fields submit', () => {
    submitForm(buttonText, nameFieldTestId, invalidName);
    cy.contains(formErrorMessage).should('be.visible');
  });

  it('Should not display error alert on valid required fields submit', () => {
    populateForm?.();
    submitForm(buttonText, nameFieldTestId, validName);
  });
};
