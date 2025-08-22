import {request} from "@/configs/request.ts";
import useSWR from "swr";
import {SubjectType} from "@/types/subject.type.ts";
import DataTable, {Column} from "@/components/DataTable.tsx";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {BookOpen} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import OpenDialogButton from "@/components/modal/OpenDialogButton.tsx";
import {buttonProps} from "@/types/props.ts";
import {SubjectModal} from "@/components/modal/SubjectModal.tsx";

export default function Subjects() {
    const fetcher = async () => {
        const res = await request.get('/subjects')
        return res.data
    }
    const {data, error, isLoading} = useSWR('/subjects', fetcher)
    const subjects = data || [] as SubjectType[]
    const columns: Column<SubjectType>[] = [{
        header: () => "Name",
        cell: (row) => row.name
    }, {
        header: () => "Description",
        cell: (row) => row.description
    }, {
        header: () => "Category",
        cell: (row) => row.category
    }, {
        header: () => "Has Formulas",
        cell: (row) => row.hasFormulas ? "Yes" : "No"
    }, {
        header: () => "Tests Count",
        cell: (row) => row.testsCount
    }, {
        header: () => "Active",
        cell: (row) => row.isActive ? "Yes" : "No"

    }]


    if (isLoading) {
        return <div>Loading...</div>;
    }


    return (
        <Card className="bg-gradient-card border-0">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5"/>
                            Fanlar / Subjects
                        </CardTitle>
                        <CardDescription>
                            Barcha fanlar va ularning ma'lumotlari
                        </CardDescription>
                    </div>
                    <OpenDialogButton
                        element={
                            (props) => <Button {...props} className="bg-gradient-to-r from-primary to-secondary"/>
                        }

                        elementProps={{
                            ...buttonProps('Yangi fan qo\'shish')
                        }}
                        dialog={SubjectModal}
                        dialogProps={{}}
                    />

                </div>
            </CardHeader>

            <CardContent>
                <div className="rounded-md border">
                    <DataTable columns={columns} data={subjects}/>
                </div>
            </CardContent>


        </Card>
    );
}