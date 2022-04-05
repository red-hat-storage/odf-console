export type CommonModalProps<T = {}> = {
    isOpen: boolean;
    closeModal: () => void;
    extraProps?: {
      [key: string]: any;
    } & T;
};
