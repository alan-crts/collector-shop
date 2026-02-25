export default function DefaultUserImage({name, image}: {name: string, image?: string | null}) {
    if (image) {
        return (
            <img src={image} alt={`Avatar de ${name}`} className="w-10 h-10 rounded-full object-cover border border-primary/20" />
        );
    }
    return (
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center border border-primary/20">
            <span className="text-white font-bold">{name.charAt(0).toUpperCase()}</span>
        </div>
    );
}