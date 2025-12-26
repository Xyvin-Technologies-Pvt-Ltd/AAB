import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertCircle, User, Calendar, FileText } from 'lucide-react';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/dialog';
import {
  useAddPartner,
  useUpdatePartner,
  useDeletePartner,
  useAddManager,
  useUpdateManager,
  useDeleteManager,
} from '@/api/queries/clientQueries';

const PersonCard = ({ person, role, onEdit, onDelete, clientId }) => {
  const now = new Date();
  const getExpiryWarning = (expiryDate) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const daysUntil = Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { severity: 'expired', days: Math.abs(daysUntil) };
    if (daysUntil <= 90) return { severity: 'warning', days: daysUntil };
    return null;
  };

  const emiratesIdWarning = getExpiryWarning(person.emiratesId?.expiryDate);
  const passportWarning = getExpiryWarning(person.passport?.expiryDate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {person.name}
          </CardTitle>
          <Badge variant={role === 'PARTNER' ? 'info' : 'secondary'}>
            {role === 'PARTNER' ? 'Partner' : 'Manager'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Emirates ID Section */}
        {person.emiratesId && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Emirates ID</span>
              {person.emiratesId.verified && (
                <Badge variant="success" className="text-xs">Verified</Badge>
              )}
            </div>
            {person.emiratesId.number && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Number:</span> {person.emiratesId.number}
              </div>
            )}
            {person.emiratesId.issueDate && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Issue Date:</span>{' '}
                {new Date(person.emiratesId.issueDate).toLocaleDateString()}
              </div>
            )}
            {person.emiratesId.expiryDate && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Expiry Date:</span>{' '}
                {new Date(person.emiratesId.expiryDate).toLocaleDateString()}
                {emiratesIdWarning && (
                  <Badge
                    variant={emiratesIdWarning.severity === 'expired' ? 'error' : 'warning'}
                    className="ml-2"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {emiratesIdWarning.severity === 'expired'
                      ? `Expired ${emiratesIdWarning.days} days ago`
                      : `Expires in ${emiratesIdWarning.days} days`}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        {/* Passport Section */}
        {person.passport && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Passport</span>
              {person.passport.verified && (
                <Badge variant="success" className="text-xs">Verified</Badge>
              )}
            </div>
            {person.passport.number && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Number:</span> {person.passport.number}
              </div>
            )}
            {person.passport.issueDate && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Issue Date:</span>{' '}
                {new Date(person.passport.issueDate).toLocaleDateString()}
              </div>
            )}
            {person.passport.expiryDate && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Expiry Date:</span>{' '}
                {new Date(person.passport.expiryDate).toLocaleDateString()}
                {passportWarning && (
                  <Badge
                    variant={passportWarning.severity === 'expired' ? 'error' : 'warning'}
                    className="ml-2"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {passportWarning.severity === 'expired'
                      ? `Expired ${passportWarning.days} days ago`
                      : `Expires in ${passportWarning.days} days`}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(person, role)}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (confirm(`Delete ${person.name}?`)) {
                onDelete(person._id, role);
              }
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const PartnersManagers = ({ clientId, partners = [], managers = [] }) => {
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showManagerForm, setShowManagerForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'PARTNER',
    emiratesId: { number: '', issueDate: '', expiryDate: '', verified: false },
    passport: { number: '', issueDate: '', expiryDate: '', verified: false },
  });

  const addPartnerMutation = useAddPartner();
  const updatePartnerMutation = useUpdatePartner();
  const deletePartnerMutation = useDeletePartner();
  const addManagerMutation = useAddManager();
  const updateManagerMutation = useUpdateManager();
  const deleteManagerMutation = useDeleteManager();

  const handleEdit = (person, role) => {
    setEditingPerson(person);
    setEditingRole(role);
    setFormData({
      name: person.name,
      role: role,
      emiratesId: person.emiratesId || { number: '', issueDate: '', expiryDate: '', verified: false },
      passport: person.passport || { number: '', issueDate: '', expiryDate: '', verified: false },
    });
    if (role === 'PARTNER') {
      setShowPartnerForm(true);
    } else {
      setShowManagerForm(true);
    }
  };

  const handleDelete = async (personId, role) => {
    try {
      if (role === 'PARTNER') {
        await deletePartnerMutation.mutateAsync({ clientId, personId });
      } else {
        await deleteManagerMutation.mutateAsync({ clientId, personId });
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        emiratesId: {
          ...formData.emiratesId,
          issueDate: formData.emiratesId.issueDate || null,
          expiryDate: formData.emiratesId.expiryDate || null,
        },
        passport: {
          ...formData.passport,
          issueDate: formData.passport.issueDate || null,
          expiryDate: formData.passport.expiryDate || null,
        },
      };

      if (editingPerson) {
        if (editingRole === 'PARTNER') {
          await updatePartnerMutation.mutateAsync({ clientId, personId: editingPerson._id, data: submitData });
        } else {
          await updateManagerMutation.mutateAsync({ clientId, personId: editingPerson._id, data: submitData });
        }
      } else {
        if (formData.role === 'PARTNER') {
          await addPartnerMutation.mutateAsync({ clientId, data: submitData });
        } else {
          await addManagerMutation.mutateAsync({ clientId, data: submitData });
        }
      }

      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      role: 'PARTNER',
      emiratesId: { number: '', issueDate: '', expiryDate: '', verified: false },
      passport: { number: '', issueDate: '', expiryDate: '', verified: false },
    });
    setEditingPerson(null);
    setEditingRole(null);
    setShowPartnerForm(false);
    setShowManagerForm(false);
  };

  const PersonForm = ({ isOpen, onClose, title, role }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPerson ? `Edit ${title}` : `Add New ${title}`}</DialogTitle>
          <DialogDescription>
            {editingPerson ? `Update ${title.toLowerCase()} information below.` : `Fill in the details to add a new ${title.toLowerCase()}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-gray-900">Emirates ID</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">ID Number</label>
                <input
                  type="text"
                  value={formData.emiratesId.number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emiratesId: { ...formData.emiratesId, number: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Issue Date</label>
                <input
                  type="date"
                  value={formData.emiratesId.issueDate ? new Date(formData.emiratesId.issueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emiratesId: { ...formData.emiratesId, issueDate: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Expiry Date</label>
                <input
                  type="date"
                  value={formData.emiratesId.expiryDate ? new Date(formData.emiratesId.expiryDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      emiratesId: { ...formData.emiratesId, expiryDate: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-gray-900">Passport</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Passport Number</label>
                <input
                  type="text"
                  value={formData.passport.number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passport: { ...formData.passport, number: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Issue Date</label>
                <input
                  type="date"
                  value={formData.passport.issueDate ? new Date(formData.passport.issueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passport: { ...formData.passport, issueDate: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Expiry Date</label>
                <input
                  type="date"
                  value={formData.passport.expiryDate ? new Date(formData.passport.expiryDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      passport: { ...formData.passport, expiryDate: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={addPartnerMutation.isPending || updatePartnerMutation.isPending}>
              {editingPerson ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Partners Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Partners</h2>
          <Button onClick={() => {
            resetForm();
            setFormData({ ...formData, role: 'PARTNER' });
            setShowPartnerForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>
        {partners.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <p className="text-gray-500">No partners added yet</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => (
              <PersonCard
                key={partner._id}
                person={partner}
                role="PARTNER"
                onEdit={handleEdit}
                onDelete={handleDelete}
                clientId={clientId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Managers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Managers</h2>
          <Button onClick={() => {
            resetForm();
            setFormData({ ...formData, role: 'MANAGER' });
            setShowManagerForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manager
          </Button>
        </div>
        {managers.length === 0 ? (
          <Card>
            <div className="p-12 text-center">
              <p className="text-gray-500">No managers added yet</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {managers.map((manager) => (
              <PersonCard
                key={manager._id}
                person={manager}
                role="MANAGER"
                onEdit={handleEdit}
                onDelete={handleDelete}
                clientId={clientId}
              />
            ))}
          </div>
        )}
      </div>

      <PersonForm
        isOpen={showPartnerForm}
        onClose={() => {
          resetForm();
        }}
        title="Partner"
        role="PARTNER"
      />
      <PersonForm
        isOpen={showManagerForm}
        onClose={() => {
          resetForm();
        }}
        title="Manager"
        role="MANAGER"
      />
    </div>
  );
};

