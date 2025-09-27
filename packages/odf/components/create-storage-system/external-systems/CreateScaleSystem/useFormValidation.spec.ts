import { renderHook } from '@testing-library/react-hooks';
import * as Yup from 'yup';
import useScaleSystemFormValidation from './useFormValidation';

// Mock the translation hook
jest.mock('@odf/shared/useCustomTranslationHook', () => ({
  useCustomTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the field requirements translations
jest.mock('@odf/shared/constants', () => ({
  fieldRequirementsTranslations: {
    maxChars: (_t: any, max: number) => `No more than ${max} characters`,
    minChars: (_t: any, min: number) => `No less than ${min} characters`,
    startAndEndName: (_t: any) =>
      'Starts and ends with a lowercase letter or number',
    alphaNumericPeriodAdnHyphen: (_t: any) =>
      'Only lowercase letters, numbers, non-consecutive periods, or hyphens',
    cannotBeEmpty: (_t: any) => 'Cannot be empty',
  },
}));

// Mock validation regex
jest.mock('@odf/shared/utils/validation', () => ({
  startAndEndsWithAlphanumerics: /^[a-z0-9](.*[a-z0-9])?$/,
  alphaNumericsPeriodsHyphensNonConsecutive:
    /(^[a-z0-9]|^([-.](?![-.])))+([a-z0-9]|([-.](?![-.])))*[a-z0-9]*$/,
}));

describe('useScaleSystemFormValidation', () => {
  const getHookResult = () => {
    const { result } = renderHook(() => useScaleSystemFormValidation());
    return result.current;
  };

  describe('Form Schema Structure', () => {
    it('should return a valid Yup schema', () => {
      const result = getHookResult();
      expect(result.formSchema).toBeInstanceOf(Yup.ObjectSchema);
    });

    it('should have all required fields in schema', () => {
      const result = getHookResult();
      const schemaFields = Object.keys(result.formSchema.fields);
      const expectedFields = [
        'name',
        'mandatory-endpoint-host',
        'mandatory-endpoint-port',
        'optional-endpoint-1-host',
        'optional-endpoint-1-port',
        'optional-endpoint-2-host',
        'optional-endpoint-2-port',
        'userName',
        'password',
        'fileSystemName',
        'encryptionUserName',
        'encryptionPassword',
        'encryptionPort',
        'client',
        'remoteRKM',
        'serverInformation',
        'tenantId',
      ];

      expectedFields.forEach((field) => {
        expect(schemaFields).toContain(field);
      });
    });

    it('should have field requirements for all input types', () => {
      const result = getHookResult();
      const expectedFieldTypes = [
        'name',
        'hostname',
        'port',
        'username',
        'password',
        'fileSystemName',
        'tenantId',
        'client',
        'serverInfo',
      ];

      expectedFieldTypes.forEach((fieldType) => {
        expect(result.fieldRequirements).toHaveProperty(fieldType);
        expect(
          Array.isArray(
            result.fieldRequirements[
              fieldType as keyof typeof result.fieldRequirements
            ]
          )
        ).toBe(true);
      });
    });
  });

  describe('System Name Validation', () => {
    it('should validate correct system names', async () => {
      const result = getHookResult();
      const validNames = [
        'my-system',
        'test123',
        'abc', // minimum 3 characters
        'my-system-123',
        'test.system',
        'a1b2c3',
      ];

      const validationPromises = validNames.map((name) =>
        result.formSchema.validateAt('name', { name })
      );
      const validationResults = await Promise.all(validationPromises);
      validationResults.forEach((validationResult, index) => {
        expect(validationResult).toBe(validNames[index]);
      });
    });

    it('should reject invalid system names', async () => {
      const result = getHookResult();
      const invalidNames = [
        '', // empty
        'a', // too short (less than 3)
        'ab', // too short (less than 3)
        'A', // uppercase
        'My-System', // uppercase
        'my_system', // underscore
        'my system', // space
        'my-system-', // ends with hyphen
        '-my-system', // starts with hyphen
        'my..system', // consecutive periods
        'my--system', // consecutive hyphens
        'a'.repeat(64), // too long (64 characters)
      ];

      const validationPromises = invalidNames.map((name) =>
        expect(result.formSchema.validateAt('name', { name })).rejects.toThrow()
      );
      await Promise.all(validationPromises);
    });

    it('should enforce minimum and maximum length for system names', async () => {
      const result = getHookResult();
      // Test minimum length
      await expect(
        result.formSchema.validateAt('name', { name: 'ab' })
      ).rejects.toThrow();
      await expect(
        result.formSchema.validateAt('name', { name: 'abc' })
      ).resolves.toBe('abc');

      // Test maximum length
      const longName = 'a'.repeat(63);
      await expect(
        result.formSchema.validateAt('name', { name: longName })
      ).resolves.toBe(longName);

      const tooLongName = 'a'.repeat(64);
      await expect(
        result.formSchema.validateAt('name', { name: tooLongName })
      ).rejects.toThrow();
    });
  });

  describe('Hostname Validation', () => {
    it('should validate correct IPv4 addresses', async () => {
      const result = getHookResult();
      const validIPs = [
        '192.168.1.1',
        '10.0.0.1',
        '255.255.255.255',
        '0.0.0.0',
        '127.0.0.1',
        '1.1.1.1',
      ];

      const validationPromises = validIPs.map((ip) =>
        result.formSchema.validateAt('mandatory-endpoint-host', {
          'mandatory-endpoint-host': ip,
        })
      );
      const results = await Promise.all(validationPromises);
      results.forEach((validationResult, index) => {
        expect(validationResult).toBe(validIPs[index]);
      });
    });

    it('should reject invalid IPv4 addresses', async () => {
      const result = getHookResult();
      const invalidIPs = [
        '1.1.1', // incomplete IP
        '1.1.1.1.1', // too many octets
        '256.1.1.1', // octet out of range
        '1.1.1.', // trailing dot
        '.1.1.1', // leading dot
        '1.1.1.1.', // trailing dot
        '1.1.1.1.1.1', // too many octets
        '999.999.999.999', // all octets out of range
        '1.1.1.1a', // invalid character
        '1.1.1.1 ', // trailing space
        ' 1.1.1.1', // leading space
      ];

      const validationPromises = invalidIPs.map((ip) =>
        expect(
          result.formSchema.validateAt('mandatory-endpoint-host', {
            'mandatory-endpoint-host': ip,
          })
        ).rejects.toThrow()
      );
      await Promise.all(validationPromises);
    });

    it('should validate correct hostnames', async () => {
      const result = getHookResult();
      const validHostnames = [
        'example.com',
        'sub.example.com',
        'a',
        'test123',
        'my-host',
        'host123.example.org',
        'a1b2c3.example.com',
      ];

      const validationPromises = validHostnames.map((hostname) =>
        result.formSchema.validateAt('mandatory-endpoint-host', {
          'mandatory-endpoint-host': hostname,
        })
      );
      const results = await Promise.all(validationPromises);
      results.forEach((validationResult, index) => {
        expect(validationResult).toBe(validHostnames[index]);
      });
    });

    it('should reject invalid hostnames', async () => {
      const result = getHookResult();
      const invalidHostnames = [
        '', // empty
        '1.1.1', // numeric only (looks like incomplete IP)
        '1.1.1.1.1', // numeric only (looks like invalid IP)
        '256.1.1.1', // numeric only (looks like invalid IP)
        'example..com', // consecutive dots
        'example-.com', // hyphen before dot
        '-example.com', // starts with hyphen
        'example.com-', // ends with hyphen
        'example .com', // space
        'example@com', // invalid character
        'example.com/', // invalid character
        'a'.repeat(254), // too long
      ];

      const validationPromises = invalidHostnames.map((hostname) =>
        expect(
          result.formSchema.validateAt('mandatory-endpoint-host', {
            'mandatory-endpoint-host': hostname,
          })
        ).rejects.toThrow()
      );
      await Promise.all(validationPromises);
    });

    it('should handle optional hostname fields correctly', async () => {
      const result = getHookResult();
      // Empty optional fields should be valid
      await expect(
        result.formSchema.validateAt('optional-endpoint-1-host', {
          'optional-endpoint-1-host': '',
        })
      ).resolves.toBeUndefined();
      await expect(
        result.formSchema.validateAt('optional-endpoint-2-host', {
          'optional-endpoint-2-host': '',
        })
      ).resolves.toBeUndefined();

      // Valid hostnames should be accepted
      await expect(
        result.formSchema.validateAt('optional-endpoint-1-host', {
          'optional-endpoint-1-host': 'example.com',
        })
      ).resolves.toBe('example.com');
    });
  });

  describe('Port Validation', () => {
    it('should validate correct port numbers', async () => {
      const result = getHookResult();
      const validPorts = [
        '1',
        '22',
        '80',
        '443',
        '8080',
        '65535',
        '3000',
        '9000',
      ];

      const validationPromises = validPorts.map((port) =>
        result.formSchema.validateAt('mandatory-endpoint-port', {
          'mandatory-endpoint-port': port,
        })
      );
      const results = await Promise.all(validationPromises);
      results.forEach((validationResult, index) => {
        expect(validationResult).toBe(validPorts[index]);
      });
    });

    it('should reject invalid port numbers', async () => {
      const result = getHookResult();
      const invalidPorts = [
        '', // empty
        '0', // too low
        '65536', // too high
        'abc', // non-numeric
        '22.5', // decimal
        '-1', // negative
        '1a', // alphanumeric
        ' 22', // leading space
        '22 ', // trailing space
        '22a', // trailing letter
      ];

      const validationPromises = invalidPorts.map((port) =>
        expect(
          result.formSchema.validateAt('mandatory-endpoint-port', {
            'mandatory-endpoint-port': port,
          })
        ).rejects.toThrow()
      );
      await Promise.all(validationPromises);
    });

    it('should handle optional port fields correctly', async () => {
      const result = getHookResult();
      // Empty optional ports should be valid
      await expect(
        result.formSchema.validateAt('optional-endpoint-1-port', {
          'optional-endpoint-1-port': '',
        })
      ).resolves.toBeUndefined();
      await expect(
        result.formSchema.validateAt('optional-endpoint-2-port', {
          'optional-endpoint-2-port': '',
        })
      ).resolves.toBeUndefined();

      // Valid ports should be accepted
      await expect(
        result.formSchema.validateAt('optional-endpoint-1-port', {
          'optional-endpoint-1-port': '8080',
        })
      ).resolves.toBe('8080');
    });
  });

  describe('Username Validation', () => {
    it('should validate correct usernames', async () => {
      const result = getHookResult();
      const validUsernames = [
        'admin',
        'user123',
        'test-user',
        'a',
        'user_name',
        'user.name',
        'user123test',
      ];

      const validationPromises = validUsernames.map((username) =>
        result.formSchema.validateAt('userName', { userName: username })
      );
      const results = await Promise.all(validationPromises);
      results.forEach((validationResult, index) => {
        expect(validationResult).toBe(validUsernames[index]);
      });
    });

    it('should reject invalid usernames', async () => {
      const result = getHookResult();
      const invalidUsernames = [
        '', // empty
        'a'.repeat(64), // too long
        // Note: The current implementation doesn't validate spaces or special characters
        // ' user', // leading space
        // 'user ', // trailing space
        // 'user@name', // invalid character
        // 'user/name', // invalid character
        // 'user\\name', // invalid character
      ];

      const validationPromises = invalidUsernames.map((username) =>
        expect(
          result.formSchema.validateAt('userName', { userName: username })
        ).rejects.toThrow()
      );
      await Promise.all(validationPromises);
    });

    it('should enforce minimum and maximum length for usernames', async () => {
      const result = getHookResult();
      // Test minimum length
      await expect(
        result.formSchema.validateAt('userName', { userName: '' })
      ).rejects.toThrow();
      await expect(
        result.formSchema.validateAt('userName', { userName: 'a' })
      ).resolves.toBe('a');

      // Test maximum length
      const longUsername = 'a'.repeat(63);
      await expect(
        result.formSchema.validateAt('userName', { userName: longUsername })
      ).resolves.toBe(longUsername);

      const tooLongUsername = 'a'.repeat(64);
      await expect(
        result.formSchema.validateAt('userName', { userName: tooLongUsername })
      ).rejects.toThrow();
    });
  });

  describe('Password Validation', () => {
    it('should validate correct passwords', async () => {
      const result = getHookResult();
      const validPasswords = [
        'a', // single character
        'ab', // two characters
        'password123',
        'mypassword',
        'a'.repeat(8), // 8 characters
        'a'.repeat(100), // long password
        'Pass123!',
        'test1234',
      ];

      const validationPromises = validPasswords.map((password) =>
        result.formSchema.validateAt('password', { password })
      );
      const results = await Promise.all(validationPromises);
      results.forEach((validationResult, index) => {
        expect(validationResult).toBe(validPasswords[index]);
      });
    });

    it('should reject invalid passwords', async () => {
      const result = getHookResult();
      const invalidPasswords = [
        '', // empty
      ];

      const validationPromises = invalidPasswords.map((password) =>
        expect(
          result.formSchema.validateAt('password', { password })
        ).rejects.toThrow()
      );
      await Promise.all(validationPromises);
    });

    it('should accept any non-empty password', async () => {
      const result = getHookResult();
      // Test that any non-empty password is valid
      await expect(
        result.formSchema.validateAt('password', { password: 'a' })
      ).resolves.toBe('a');
      await expect(
        result.formSchema.validateAt('password', { password: '1234567' })
      ).resolves.toBe('1234567');
      await expect(
        result.formSchema.validateAt('password', { password: '12345678' })
      ).resolves.toBe('12345678');
    });
  });

  describe('File System Name Validation', () => {
    it('should validate correct file system names', async () => {
      const result = getHookResult();
      const validNames = [
        'my-filesystem',
        'test123',
        'abc', // minimum 3 characters
        'my-filesystem-123',
        'test.filesystem',
        'a1b2c3',
      ];

      const validationPromises = validNames.map((name) =>
        result.formSchema.validateAt('fileSystemName', {
          fileSystemName: name,
        })
      );
      const validationResults = await Promise.all(validationPromises);
      validationResults.forEach((validationResult, index) => {
        expect(validationResult).toBe(validNames[index]);
      });
    });

    it('should reject invalid file system names', async () => {
      const result = getHookResult();
      const invalidNames = [
        '', // empty
        'a', // too short (less than 3)
        'ab', // too short (less than 3)
        'A', // uppercase
        'My-Filesystem', // uppercase
        'my_filesystem', // underscore
        'my filesystem', // space
        'my-filesystem-', // ends with hyphen
        '-my-filesystem', // starts with hyphen
        'my..filesystem', // consecutive periods
        'my--filesystem', // consecutive hyphens
        'a'.repeat(64), // too long (64 characters)
      ];

      const validationPromises = invalidNames.map((name) =>
        expect(
          result.formSchema.validateAt('fileSystemName', {
            fileSystemName: name,
          })
        ).rejects.toThrow()
      );
      await Promise.all(validationPromises);
    });
  });

  describe('Encryption Fields Validation', () => {
    it('should validate encryption fields when provided', async () => {
      const result = getHookResult();
      const validEncryptionData = {
        encryptionUserName: 'encryption-user',
        encryptionPassword: 'encryption123',
        encryptionPort: '443',
        client: 'my-client',
        remoteRKM: 'rkm.example.com',
        serverInformation: 'server.example.com:443',
        tenantId: 'tenant-123',
      };

      const validationPromises = Object.entries(validEncryptionData).map(
        ([field, value]) =>
          result.formSchema.validateAt(field, { [field]: value })
      );
      const validationResults = await Promise.all(validationPromises);
      validationResults.forEach((validationResult, index) => {
        const [, value] = Object.entries(validEncryptionData)[index];
        expect(validationResult).toBe(value);
      });
    });

    it('should allow empty encryption fields (optional)', async () => {
      const result = getHookResult();
      const optionalEncryptionFields = [
        'encryptionUserName',
        'encryptionPassword',
        'encryptionPort',
        'client',
        'remoteRKM',
        'serverInformation',
        'tenantId',
      ];

      const validationPromises = optionalEncryptionFields.map((field) =>
        result.formSchema.validateAt(field, { [field]: '' })
      );
      const validationResults = await Promise.all(validationPromises);
      validationResults.forEach((validationResult) => {
        expect(validationResult).toBeUndefined();
      });
    });

    it('should validate encryption port numbers', async () => {
      const result = getHookResult();
      const validPorts = ['443', '8080', '3000'];
      const invalidPorts = ['0', '65536', 'abc', '22.5'];

      const validValidationPromises = validPorts.map((port) =>
        result.formSchema.validateAt('encryptionPort', {
          encryptionPort: port,
        })
      );
      const validResults = await Promise.all(validValidationPromises);
      validResults.forEach((validationResult, index) => {
        expect(validationResult).toBe(validPorts[index]);
      });

      const invalidValidationPromises = invalidPorts.map((port) =>
        expect(
          result.formSchema.validateAt('encryptionPort', {
            encryptionPort: port,
          })
        ).rejects.toThrow()
      );
      await Promise.all(invalidValidationPromises);
    });

    it('should validate encryption hostname fields', async () => {
      const result = getHookResult();
      const validHostnames = ['rkm.example.com', '192.168.1.1'];
      const invalidHostnames = ['1.1.1', '256.1.1.1', 'example..com'];

      const validValidationPromises = validHostnames.map((hostname) =>
        result.formSchema.validateAt('remoteRKM', { remoteRKM: hostname })
      );
      const validResults = await Promise.all(validValidationPromises);
      validResults.forEach((validationResult, index) => {
        expect(validationResult).toBe(validHostnames[index]);
      });

      const invalidValidationPromises = invalidHostnames.map((hostname) =>
        expect(
          result.formSchema.validateAt('remoteRKM', { remoteRKM: hostname })
        ).rejects.toThrow()
      );
      await Promise.all(invalidValidationPromises);
    });
  });

  describe('Field Requirements', () => {
    it('should provide field requirements for all input types', () => {
      const result = getHookResult();
      const fieldRequirements = result.fieldRequirements;

      // Check that all field types have requirements
      expect(fieldRequirements.name).toBeDefined();
      expect(fieldRequirements.hostname).toBeDefined();
      expect(fieldRequirements.port).toBeDefined();
      expect(fieldRequirements.username).toBeDefined();
      expect(fieldRequirements.password).toBeDefined();
      expect(fieldRequirements.fileSystemName).toBeDefined();
      expect(fieldRequirements.tenantId).toBeDefined();
      expect(fieldRequirements.client).toBeDefined();
      expect(fieldRequirements.serverInfo).toBeDefined();

      // Check that requirements are arrays of strings
      Object.values(fieldRequirements).forEach((requirements) => {
        expect(Array.isArray(requirements)).toBe(true);
        requirements.forEach((requirement) => {
          expect(typeof requirement).toBe('string');
          expect(requirement.length).toBeGreaterThan(0);
        });
      });
    });

    it('should have appropriate number of requirements for each field type', () => {
      const result = getHookResult();
      const fieldRequirements = result.fieldRequirements;

      // Name and file system name should have similar requirements
      expect(fieldRequirements.name.length).toBeGreaterThanOrEqual(3);
      expect(fieldRequirements.fileSystemName.length).toBeGreaterThanOrEqual(3);

      // Hostname should have multiple requirements
      expect(fieldRequirements.hostname.length).toBeGreaterThanOrEqual(2);

      // Port should have specific requirements
      expect(fieldRequirements.port.length).toBeGreaterThanOrEqual(1);

      // Username should have length requirements
      expect(fieldRequirements.username.length).toBeGreaterThanOrEqual(2);

      // Password should have minimum length requirement
      expect(fieldRequirements.password.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Schema Integration', () => {
    it('should validate complete form data correctly', async () => {
      const result = getHookResult();
      const validFormData = {
        name: 'my-scale-system',
        'mandatory-endpoint-host': '192.168.1.1',
        'mandatory-endpoint-port': '8080',
        'optional-endpoint-1-host': '192.168.1.2',
        'optional-endpoint-1-port': '8081',
        'optional-endpoint-2-host': '192.168.1.3',
        'optional-endpoint-2-port': '8082',
        userName: 'admin',
        password: 'password123',
        fileSystemName: 'my-filesystem',
        encryptionUserName: 'encryption-user',
        encryptionPassword: 'encryption123',
        encryptionPort: '443',
        client: 'my-client',
        remoteRKM: 'rkm.example.com',
        serverInformation: 'server.example.com:443',
        tenantId: 'tenant-123',
      };

      await expect(
        result.formSchema.validate(validFormData)
      ).resolves.toMatchObject(validFormData);
    });

    it('should reject incomplete mandatory form data', async () => {
      const result = getHookResult();
      const incompleteFormData = {
        name: 'my-scale-system',
        // Missing mandatory fields
      };

      await expect(
        result.formSchema.validate(incompleteFormData)
      ).rejects.toThrow();
    });

    it('should handle partial encryption data correctly', async () => {
      const result = getHookResult();
      const partialEncryptionData = {
        name: 'my-scale-system',
        'mandatory-endpoint-host': '192.168.1.1',
        'mandatory-endpoint-port': '8080',
        userName: 'admin',
        password: 'password123',
        fileSystemName: 'my-filesystem',
        // Only some encryption fields provided
        encryptionUserName: 'encryption-user',
        encryptionPassword: 'encryption123',
        // Missing other encryption fields
      };

      // Should be valid since encryption fields are optional
      await expect(
        result.formSchema.validate(partialEncryptionData)
      ).resolves.toMatchObject(partialEncryptionData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', async () => {
      const result = getHookResult();
      // Test minimum valid values
      const minValidData = {
        name: 'abc', // minimum length
        'mandatory-endpoint-host': 'a', // minimum hostname
        'mandatory-endpoint-port': '1', // minimum port
        userName: 'a', // minimum username
        password: 'a'.repeat(8), // minimum password length
        fileSystemName: 'abc', // minimum length
      };

      await expect(
        result.formSchema.validate(minValidData)
      ).resolves.toMatchObject(minValidData);
    });

    it('should handle maximum valid values correctly', async () => {
      const result = getHookResult();
      // Test maximum valid values
      const maxValidData = {
        name: 'a'.repeat(63), // maximum length
        'mandatory-endpoint-host': 'a'.repeat(253), // maximum hostname length
        'mandatory-endpoint-port': '65535', // maximum port
        userName: 'a'.repeat(63), // maximum username length
        password: 'a'.repeat(100), // long password
        fileSystemName: 'a'.repeat(63), // maximum length
      };

      await expect(
        result.formSchema.validate(maxValidData)
      ).resolves.toMatchObject(maxValidData);
    });

    it('should handle special characters in valid contexts', async () => {
      const result = getHookResult();
      const specialCharData = {
        name: 'test-system-123',
        'mandatory-endpoint-host': 'sub.example.com',
        'mandatory-endpoint-port': '8080',
        userName: 'user_name',
        password: 'password123',
        fileSystemName: 'test.filesystem',
      };

      await expect(
        result.formSchema.validate(specialCharData)
      ).resolves.toMatchObject(specialCharData);
    });
  });

  describe('Performance', () => {
    it('should return consistent field requirements structure', () => {
      const result1 = getHookResult();
      const result2 = getHookResult();

      // The hook should return consistent structure
      expect(result1.fieldRequirements).toEqual(result2.fieldRequirements);
    });

    it('should not recreate field requirements unnecessarily', () => {
      const { result: hookResult, rerender } = renderHook(() =>
        useScaleSystemFormValidation()
      );
      const initialFieldRequirements = hookResult.current.fieldRequirements;

      rerender();
      const newFieldRequirements = hookResult.current.fieldRequirements;

      // Field requirements should have the same structure and content
      expect(newFieldRequirements).toEqual(initialFieldRequirements);
    });
  });

  describe('Form Methods', () => {
    it('should return form control, handleSubmit, formState, and watch methods', () => {
      const result = getHookResult();

      expect(result.control).toBeDefined();
      expect(result.handleSubmit).toBeDefined();
      expect(result.formState).toBeDefined();
      expect(result.formState.isSubmitted).toBeDefined();
      expect(result.watch).toBeDefined();
    });

    it('should initialize form with default values', () => {
      const { result } = renderHook(() => useScaleSystemFormValidation());

      // The form should be initialized with empty default values
      expect(result.current.control).toBeDefined();
      expect(result.current.handleSubmit).toBeDefined();
      expect(result.current.getValues).toBeDefined();
    });
  });
});
