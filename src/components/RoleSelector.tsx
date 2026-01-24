import { UserRole } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Shield, User, HandHeart, ShieldCheck } from 'lucide-react';

interface RoleSelectorProps {
  onSelectRole: (role: UserRole) => void;
}

const roles = [
  {
    role: 'citizen' as UserRole,
    title: 'Citizen / Volunteer',
    description: 'Report hazards, volunteer, and contribute to ocean safety',
    icon: User,
    color: 'bg-blue-500',
  },
  {
    role: 'authority' as UserRole,
    title: 'Authority / Official',
    description: 'Manage reports, monitor incidents, and coordinate response',
    icon: Shield,
    color: 'bg-indigo-600',
  },
  {
    role: 'ngo' as UserRole,
    title: 'NGO / Organization',
    description: 'Coordinate relief efforts, manage donations and volunteers',
    icon: HandHeart,
    color: 'bg-rose-500',
  },
  {
    role: 'responder' as UserRole,
    title: 'Responder / Field Team',
    description: 'Respond to emergencies and coordinate on-ground activities',
    icon: ShieldCheck,
    color: 'bg-emerald-600',
  },
];

export function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0077B6] to-[#00B4D8] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🌊</span>
            </div>
            <div className="text-left">
              <h1 className="text-4xl text-white tracking-tight">Tarang</h1>
              <p className="text-white/80 text-sm">Ocean Hazard Monitoring Platform</p>
            </div>
          </div>
          <p className="text-white/90 text-lg max-w-2xl mx-auto">
            Select your role to access your personalized dashboard and features
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((roleItem) => {
            const Icon = roleItem.icon;
            return (
              <Card
                key={roleItem.role}
                className="hover:shadow-xl transition-all cursor-pointer border-2 hover:border-[#0077B6]"
                onClick={() => onSelectRole(roleItem.role)}
              >
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 ${roleItem.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-1">{roleItem.title}</CardTitle>
                      <CardDescription>{roleItem.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-[#0077B6] hover:bg-[#005a8c]">
                    Login as {roleItem.title.split('/')[0].trim()}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-white/70 text-sm">
          <p>Powered by INCOIS • Built with React + Tailwind + Firebase</p>
        </div>
      </div>
    </div>
  );
}
