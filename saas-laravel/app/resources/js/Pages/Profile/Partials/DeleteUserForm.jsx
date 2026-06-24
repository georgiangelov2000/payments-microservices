import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';

import i18n from '@/i18n';
export default function DeleteUserForm({ className = '' }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef();

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);

        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-6 ${className}`}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">{i18n.t('generated.profile_DeleteUserForm.deleteAccount')}</h2>

                <p className="mt-1 text-sm text-gray-600">{i18n.t('generated.profile_DeleteUserForm.onceYourAccountIsDeletedAllOfIts')}</p>
            </header>

            <DangerButton onClick={confirmUserDeletion}>{i18n.t('generated.profile_DeleteUserForm.deleteAccount')}</DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    <h2 className="text-lg font-medium text-gray-900">{i18n.t('generated.profile_DeleteUserForm.areYouSureYouWantToDeleteYour')}</h2>

                    <p className="mt-1 text-sm text-gray-600">{i18n.t('generated.profile_DeleteUserForm.onceYourAccountIsDeletedAllOfIts56fc74')}</p>

                    <div className="mt-6">
                        <InputLabel
                            htmlFor="password"
                            value="Password"
                            className="sr-only"
                        />

                        <TextInput
                            id="password"
                            type="password"
                            name="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="mt-1 block w-3/4"
                            isFocused
                            placeholder={i18n.t('generated.profile_DeleteUserForm.password')}
                        />

                        <InputError
                            message={errors.password}
                            className="mt-2"
                        />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={closeModal}>{i18n.t('common.actions.cancel')}</SecondaryButton>

                        <DangerButton className="ms-3" disabled={processing}>{i18n.t('generated.profile_DeleteUserForm.deleteAccount')}</DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}
