'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, Search, Edit, MailQuestion, Trash2, Users } from 'lucide-react';
import type { UserProfile } from '@/types';

const playerTypeLabels: Record<UserProfile['playerType'], string> = {
  player: 'Hráč',
  goalie: 'Brankář',
  member: 'Člen',
};

export interface TeamMembersTableProps {
  users: UserProfile[];
  onEditUser: (user: UserProfile) => void;
  onResetPassword: (email: string) => void;
  onDeleteUser: (user: UserProfile) => void;
  onAddUser: () => void;
}

export function TeamMembersTable({
  users,
  onEditUser,
  onResetPassword,
  onDeleteUser,
  onAddUser,
}: TeamMembersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const matchName = u.name.toLowerCase().includes(term);
      const matchEmail = u.email.toLowerCase().includes(term);
      const matchJersey = u.jerseyNumber !== undefined && String(u.jerseyNumber).includes(term);
      return matchName || matchEmail || matchJersey;
    });
  }, [users, searchTerm]);

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-primary" />
            Správa týmu
          </CardTitle>
          <CardDescription>
            Seznam všech registrovaných hráčů a členů týmu HC Aces ({users.length}).
          </CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Hledat hráče, číslo, e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button onClick={onAddUser} className="h-9 shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Přidat účet
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <div className="rounded-md border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Hráč</TableHead>
                <TableHead className="hidden md:table-cell">Kontakt</TableHead>
                <TableHead>Pozice</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-10 text-right pr-4">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-sm">
                    {searchTerm ? 'Nenalezen žádný člen odpovídající hledání.' : 'V týmu nejsou žádní uživatelé.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarImage src={u.photoURL ?? `https://picsum.photos/seed/${u.email}/100/100`} />
                          <AvatarFallback className="font-bold text-xs">{u.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-sm leading-none">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {u.jerseyNumber ? `#${u.jerseyNumber}` : 'bez čísla'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {u.email}
                      {u.phoneNumber && (
                        <span className="block text-[11px] text-muted-foreground/80 mt-0.5">
                          {u.phoneNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                        {playerTypeLabels[u.playerType] || u.playerType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === 'admin' ? 'default' : 'secondary'}
                        className="text-[10px] uppercase font-bold tracking-wider"
                      >
                        {u.role === 'admin' ? 'Admin' : 'Hráč'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-3">
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Menu akcí</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => onEditUser(u)}>
                            <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                            Upravit profil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onResetPassword(u.email)}>
                            <MailQuestion className="mr-2 h-4 w-4 text-muted-foreground" />
                            Resetovat heslo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => onDeleteUser(u)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Smazat z DB
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
