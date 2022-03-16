export type ProvisionerProps = {
    parameterKey: string;
    parameterValue: string;
    onParamChange: (param: string, event: string, checkbox: boolean) => void;
};
  
export type ExtensionSCProvisionerProp = {
    [key: string]: {
        [key: string]: {
        title: string;
        provisioner: string;
        allowVolumeExpansion: boolean;
        parameters: {
            [key: string]: {
            name: string;
            hintText: string;
            value?: string;
            visible?: (params?: any) => boolean;
            required?: boolean | ((params?: any) => boolean);
            Component?: React.ComponentType<ProvisionerProps>;
            };
        };
        };
    };
};
