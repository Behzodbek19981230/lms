import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";


interface Props {
    open: boolean
    setOpen: (open: boolean) => void
    // tool: ITool
    // fetchApplication: () => void
}


export const SubjectModal = ({open, setOpen,}: Props) => {


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

    };
    const onClose = () => setOpen(false);


    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Yangi fan qo'shish
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="name">Fan nomi *</Label>
                            <Input
                                id="name"
                                placeholder="Web Development"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="code">Fan kodi *</Label>
                            <Input
                                id="code"
                                placeholder="WEB101"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="instructor">O'qituvchi *</Label>
                            <Input
                                id="instructor"
                                placeholder="John Smith"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="category">Kategoriya *</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Kategoriyani tanlang"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Programming">Programming</SelectItem>
                                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                                    <SelectItem value="Design">Design</SelectItem>
                                    <SelectItem value="Database">Database</SelectItem>
                                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                                    <SelectItem value="Physics">Physics</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="credits">Kredit *</Label>
                            <Input
                                id="credits"
                                type="number"
                                min="1"
                                max="10"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="duration">Davomiyligi *</Label>
                            <Input
                                id="duration"
                                placeholder="16 weeks"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="students">Talabalar soni</Label>
                            <Input
                                id="students"
                                type="number"
                                min="0"

                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="status">Holati</Label>

                    </div>

                    <div>
                        <Label htmlFor="description">Tavsif</Label>
                        <Textarea
                            id="description"
                            placeholder="Fan haqida qisqacha ma'lumot..."
                            rows={3}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Bekor qilish
                        </Button>
                        <Button type="submit">
                            Qo'shish
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};